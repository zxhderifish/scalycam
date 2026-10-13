-- Indexes
create index on meals (user_id, captured_at desc);
create index on meals (recognition_status, created_at) where recognition_status = 'pending';
create index on food_entries (user_id, created_at desc);
create index on food_entries (meal_id);
create index on weight_logs (user_id, logged_at desc);

-- food_entries user consistency trigger
create or replace function check_food_entry_user_consistency() returns trigger as $$
begin
  if new.user_id <> (select user_id from meals where id = new.meal_id) then
    raise exception 'food_entries.user_id (%) mismatch with meals.user_id', new.user_id;
  end if;
  return new;
end; $$ language plpgsql;

create trigger food_entries_user_consistency
  before insert or update on food_entries
  for each row execute function check_food_entry_user_consistency();

-- updated_at auto-update trigger
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

create trigger meals_updated_at before update on meals
  for each row execute function touch_updated_at();
create trigger food_entries_updated_at before update on food_entries
  for each row execute function touch_updated_at();
create trigger user_settings_updated_at before update on user_settings
  for each row execute function touch_updated_at();

-- Observability views (non-materialized; revisit at 10K MAU)
create or replace view v_daily_active_users as
  select date_trunc('day', captured_at) as day, count(distinct user_id) as dau
  from meals group by 1 order by 1 desc;

create or replace view v_recognition_success_rate as
  select
    round(100.0 * count(*) filter (where recognition_status = 'recognized') / nullif(count(*), 0), 1) as pct_recognized,
    count(*) filter (where recognition_status = 'recognized') as recognized,
    count(*) filter (where recognition_status = 'failed') as failed,
    count(*) filter (where recognition_status = 'pending') as pending
  from meals
  where created_at >= now() - interval '7 days';

create or replace view v_recognition_latency as
  select
    percentile_cont(0.50) within group (order by latency_ms) as p50_ms,
    percentile_cont(0.95) within group (order by latency_ms) as p95_ms
  from llm_call_log
  where endpoint = 'upload_meal' and status = 'ok'
    and created_at >= now() - interval '7 days';

create or replace view v_foods_cache_hit_rate as
  select
    count(*) filter (where status = 'cache_hit') as hits,
    count(*) filter (where status != 'cache_hit') as misses,
    round(100.0 * count(*) filter (where status = 'cache_hit') / nullif(count(*),0), 1) as hit_pct
  from llm_call_log
  where created_at >= now() - interval '7 days';

create or replace view v_avg_meals_per_active_day as
  select round(avg(meal_count), 2) as avg_meals
  from (
    select user_id, date_trunc('day', captured_at) as day, count(*) as meal_count
    from meals where recognition_status = 'recognized'
    group by 1, 2
  ) sub;

create or replace view v_llm_cost_weekly as
  select
    date_trunc('week', created_at) as week,
    sum(cost_usd) as total_usd,
    count(*) as calls
  from llm_call_log
  group by 1 order by 1 desc;
