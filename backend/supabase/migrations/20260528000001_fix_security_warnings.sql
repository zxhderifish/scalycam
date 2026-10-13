-- =============================================================================
-- Fix Supabase security/performance advisor warnings
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. RLS Disabled in Public
--    foods_cache, food_aliases, rate_limits, llm_call_log are internal tables
--    accessed only by the service role. Enabling RLS with no user policies
--    effectively blocks direct client access while service role still works.
-- ---------------------------------------------------------------------------
alter table public.foods_cache  enable row level security;
alter table public.food_aliases enable row level security;
alter table public.rate_limits  enable row level security;
alter table public.llm_call_log enable row level security;


-- ---------------------------------------------------------------------------
-- 2. Security Definer Views
--    Analytics views should only be queryable by service_role/postgres.
--    Re-create with security_invoker=true (PG 15) AND revoke public access.
-- ---------------------------------------------------------------------------
alter view public.v_daily_active_users         set (security_invoker = true);
alter view public.v_recognition_success_rate   set (security_invoker = true);
alter view public.v_recognition_latency        set (security_invoker = true);
alter view public.v_foods_cache_hit_rate       set (security_invoker = true);
alter view public.v_avg_meals_per_active_day   set (security_invoker = true);
alter view public.v_llm_cost_weekly            set (security_invoker = true);

-- Revoke public/authenticated access — only postgres/service_role should query these
revoke select on public.v_daily_active_users         from anon, authenticated;
revoke select on public.v_recognition_success_rate   from anon, authenticated;
revoke select on public.v_recognition_latency        from anon, authenticated;
revoke select on public.v_foods_cache_hit_rate       from anon, authenticated;
revoke select on public.v_avg_meals_per_active_day   from anon, authenticated;
revoke select on public.v_llm_cost_weekly            from anon, authenticated;


-- ---------------------------------------------------------------------------
-- 3. Auth RLS Initialization Plan
--    Replace auth.uid() with (select auth.uid()) in every RLS policy so
--    PostgreSQL evaluates it once per query instead of once per row.
-- ---------------------------------------------------------------------------

-- profiles (keyed by id)
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;

create policy "profiles_select" on public.profiles
  for select using (id = (select auth.uid()));
create policy "profiles_insert" on public.profiles
  for insert with check (id = (select auth.uid()));
create policy "profiles_update" on public.profiles
  for update using (id = (select auth.uid()));
create policy "profiles_delete" on public.profiles
  for delete using (id = (select auth.uid()));

-- user_settings
drop policy if exists "user_settings_select" on public.user_settings;
drop policy if exists "user_settings_insert" on public.user_settings;
drop policy if exists "user_settings_update" on public.user_settings;
drop policy if exists "user_settings_delete" on public.user_settings;

create policy "user_settings_select" on public.user_settings
  for select using (user_id = (select auth.uid()));
create policy "user_settings_insert" on public.user_settings
  for insert with check (user_id = (select auth.uid()));
create policy "user_settings_update" on public.user_settings
  for update using (user_id = (select auth.uid()));
create policy "user_settings_delete" on public.user_settings
  for delete using (user_id = (select auth.uid()));

-- devices
drop policy if exists "devices_select" on public.devices;
drop policy if exists "devices_insert" on public.devices;
drop policy if exists "devices_update" on public.devices;
drop policy if exists "devices_delete" on public.devices;

create policy "devices_select" on public.devices
  for select using (user_id = (select auth.uid()));
create policy "devices_insert" on public.devices
  for insert with check (user_id = (select auth.uid()));
create policy "devices_update" on public.devices
  for update using (user_id = (select auth.uid()));
create policy "devices_delete" on public.devices
  for delete using (user_id = (select auth.uid()));

-- meals
drop policy if exists "meals_select" on public.meals;
drop policy if exists "meals_insert" on public.meals;
drop policy if exists "meals_update" on public.meals;
drop policy if exists "meals_delete" on public.meals;

create policy "meals_select" on public.meals
  for select using (user_id = (select auth.uid()));
create policy "meals_insert" on public.meals
  for insert with check (user_id = (select auth.uid()));
create policy "meals_update" on public.meals
  for update using (user_id = (select auth.uid()));
create policy "meals_delete" on public.meals
  for delete using (user_id = (select auth.uid()));

-- food_entries
drop policy if exists "food_entries_select" on public.food_entries;
drop policy if exists "food_entries_insert" on public.food_entries;
drop policy if exists "food_entries_update" on public.food_entries;
drop policy if exists "food_entries_delete" on public.food_entries;

create policy "food_entries_select" on public.food_entries
  for select using (user_id = (select auth.uid()));
create policy "food_entries_insert" on public.food_entries
  for insert with check (user_id = (select auth.uid()));
create policy "food_entries_update" on public.food_entries
  for update using (user_id = (select auth.uid()));
create policy "food_entries_delete" on public.food_entries
  for delete using (user_id = (select auth.uid()));

-- weight_logs
drop policy if exists "weight_logs_select" on public.weight_logs;
drop policy if exists "weight_logs_insert" on public.weight_logs;
drop policy if exists "weight_logs_update" on public.weight_logs;
drop policy if exists "weight_logs_delete" on public.weight_logs;

create policy "weight_logs_select" on public.weight_logs
  for select using (user_id = (select auth.uid()));
create policy "weight_logs_insert" on public.weight_logs
  for insert with check (user_id = (select auth.uid()));
create policy "weight_logs_update" on public.weight_logs
  for update using (user_id = (select auth.uid()));
create policy "weight_logs_delete" on public.weight_logs
  for delete using (user_id = (select auth.uid()));

-- push_tokens
drop policy if exists "push_tokens_select" on public.push_tokens;
drop policy if exists "push_tokens_insert" on public.push_tokens;
drop policy if exists "push_tokens_update" on public.push_tokens;
drop policy if exists "push_tokens_delete" on public.push_tokens;

create policy "push_tokens_select" on public.push_tokens
  for select using (user_id = (select auth.uid()));
create policy "push_tokens_insert" on public.push_tokens
  for insert with check (user_id = (select auth.uid()));
create policy "push_tokens_update" on public.push_tokens
  for update using (user_id = (select auth.uid()));
create policy "push_tokens_delete" on public.push_tokens
  for delete using (user_id = (select auth.uid()));


-- ---------------------------------------------------------------------------
-- 4. Function Search Path Mutable
--    Fix search_path on all three functions to prevent search_path injection.
-- ---------------------------------------------------------------------------
alter function public.check_food_entry_user_consistency()
  set search_path = public;

alter function public.touch_updated_at()
  set search_path = public;

alter function public.atomic_rate_limit(uuid, text, timestamptz)
  set search_path = public;
