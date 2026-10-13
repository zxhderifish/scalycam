-- Enable extensions (Supabase Pro has pg_cron and pg_net enabled by default)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- cleanup_stuck_meals: runs every 5 minutes via pg_cron SQL (no pg_net needed)
select cron.schedule(
  'cleanup_stuck_meals',
  '*/5 * * * *',
  $$
    update meals set recognition_status = 'failed', updated_at = now()
     where recognition_status = 'pending'
       and created_at < now() - interval '3 minutes';
  $$
);

-- HTTP-triggered jobs are configured separately; see backend/DEPLOYMENT.md.

-- rate_limits GC: daily at 04:00 UTC
select cron.schedule(
  'cron_rate_limits_gc',
  '0 4 * * *',
  $$
    delete from rate_limits where bucket_at < now() - interval '1 hour';
  $$
);
