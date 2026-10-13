-- Enable RLS on all user-owned tables
alter table profiles enable row level security;
alter table user_settings enable row level security;
alter table devices enable row level security;
alter table meals enable row level security;
alter table food_entries enable row level security;
alter table weight_logs enable row level security;
alter table push_tokens enable row level security;

-- profiles (keyed by id, not user_id)
create policy "profiles_select" on profiles for select using (id = auth.uid());
create policy "profiles_insert" on profiles for insert with check (id = auth.uid());
create policy "profiles_update" on profiles for update using (id = auth.uid());
create policy "profiles_delete" on profiles for delete using (id = auth.uid());

-- user_settings
create policy "user_settings_select" on user_settings for select using (user_id = auth.uid());
create policy "user_settings_insert" on user_settings for insert with check (user_id = auth.uid());
create policy "user_settings_update" on user_settings for update using (user_id = auth.uid());
create policy "user_settings_delete" on user_settings for delete using (user_id = auth.uid());

-- devices
create policy "devices_select" on devices for select using (user_id = auth.uid());
create policy "devices_insert" on devices for insert with check (user_id = auth.uid());
create policy "devices_update" on devices for update using (user_id = auth.uid());
create policy "devices_delete" on devices for delete using (user_id = auth.uid());

-- meals
create policy "meals_select" on meals for select using (user_id = auth.uid());
create policy "meals_insert" on meals for insert with check (user_id = auth.uid());
create policy "meals_update" on meals for update using (user_id = auth.uid());
create policy "meals_delete" on meals for delete using (user_id = auth.uid());

-- food_entries
create policy "food_entries_select" on food_entries for select using (user_id = auth.uid());
create policy "food_entries_insert" on food_entries for insert with check (user_id = auth.uid());
create policy "food_entries_update" on food_entries for update using (user_id = auth.uid());
create policy "food_entries_delete" on food_entries for delete using (user_id = auth.uid());

-- weight_logs
create policy "weight_logs_select" on weight_logs for select using (user_id = auth.uid());
create policy "weight_logs_insert" on weight_logs for insert with check (user_id = auth.uid());
create policy "weight_logs_update" on weight_logs for update using (user_id = auth.uid());
create policy "weight_logs_delete" on weight_logs for delete using (user_id = auth.uid());

-- push_tokens
create policy "push_tokens_select" on push_tokens for select using (user_id = auth.uid());
create policy "push_tokens_insert" on push_tokens for insert with check (user_id = auth.uid());
create policy "push_tokens_update" on push_tokens for update using (user_id = auth.uid());
create policy "push_tokens_delete" on push_tokens for delete using (user_id = auth.uid());

-- server-only tables have no client policy; only service role accesses them
-- foods_cache, food_aliases, rate_limits, llm_call_log: no RLS needed (service role only)
