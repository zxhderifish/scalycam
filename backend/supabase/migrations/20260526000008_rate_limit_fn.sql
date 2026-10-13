create or replace function atomic_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_bucket_at timestamptz
) returns int language plpgsql as $$
declare
  v_count int;
begin
  insert into rate_limits (user_id, endpoint, bucket_at, count)
  values (p_user_id, p_endpoint, p_bucket_at, 1)
  on conflict (user_id, endpoint, bucket_at)
  do update set count = rate_limits.count + 1
  returning count into v_count;
  return v_count;
end;
$$;
