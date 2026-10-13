-- ROLLBACK:
-- drop table if exists devices;
-- drop table if exists user_settings;
-- drop table if exists profiles;

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  created_at    timestamptz not null default now()
);

create table user_settings (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  height_cm            numeric,
  weight_kg            numeric,
  age                  int,
  sex                  text check (sex in ('male','female','other')),
  activity_level       numeric,
  goal                 text check (goal in ('lose','maintain','gain')),
  daily_calorie_target int,
  daily_protein_g      int,
  daily_carbs_g        int,
  daily_fat_g          int,
  timezone             text not null default 'UTC',
  notification_prefs   jsonb not null default
    '{"evening_recap": true, "per_meal": false, "errors_only": false}',
  updated_at           timestamptz not null default now()
);
create index on user_settings (timezone);

create table devices (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  chip_id          text not null,
  ble_address      text not null,
  device_name      text,
  firmware_version text,
  paired_at        timestamptz not null default now(),
  last_seen_at     timestamptz,
  unique (user_id, chip_id)
);
