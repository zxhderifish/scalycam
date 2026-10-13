-- ROLLBACK:
-- drop table if exists food_entries;
-- drop table if exists meals;
-- drop table if exists weight_logs;
-- drop table if exists push_tokens;

create table meals (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  device_id           uuid references devices(id) on delete set null,
  client_event_id     uuid not null,
  captured_at         timestamptz not null,
  meal_type           text,
  total_weight_g      numeric,
  image_path          text,
  thumbnail_path      text,
  recognition_status  text not null default 'pending'
                      check (recognition_status in ('pending','recognized','failed')),
  llm_raw_response    jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, client_event_id)
);

create table food_entries (
  id                  uuid primary key default gen_random_uuid(),
  meal_id             uuid not null references meals(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  food_name           text not null,
  weight_g            numeric not null,
  calories_kcal       numeric not null,
  protein_g           numeric not null,
  carbs_g             numeric not null,
  fat_g               numeric not null,
  confidence          numeric,
  alternative_names   jsonb,
  is_user_edited      boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table weight_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  weight_kg     numeric not null,
  logged_at     timestamptz not null,
  source        text not null default 'manual',
  created_at    timestamptz not null default now()
);

create table push_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  expo_token    text not null unique,
  platform      text not null check (platform in ('ios','android')),
  updated_at    timestamptz not null default now()
);
