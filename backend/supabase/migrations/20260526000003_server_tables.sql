-- ROLLBACK:
-- drop table if exists llm_call_log;
-- drop table if exists rate_limits;
-- drop table if exists food_aliases;
-- drop table if exists foods_cache;

create table foods_cache (
  food_name_normalized       text primary key,
  calories_kcal_per_100g     numeric not null,
  protein_g_per_100g         numeric not null,
  carbs_g_per_100g           numeric not null,
  fat_g_per_100g             numeric not null,
  source                     text not null,
  hit_count                  int not null default 1,
  last_used_at               timestamptz not null default now()
);

create table food_aliases (
  alias_normalized       text primary key,
  canonical_normalized   text not null references foods_cache(food_name_normalized) on delete cascade
);

create table rate_limits (
  user_id     uuid not null,
  endpoint    text not null,
  bucket_at   timestamptz not null,
  count       int not null default 0,
  primary key (user_id, endpoint, bucket_at)
);

create table llm_call_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid,
  meal_id       uuid,
  endpoint      text not null,
  model         text not null,
  input_tokens  int,
  output_tokens int,
  cost_usd      numeric,
  latency_ms    int,
  status        text not null,
  created_at    timestamptz not null default now()
);
create index on llm_call_log (created_at desc);
create index on llm_call_log (user_id, created_at desc);
