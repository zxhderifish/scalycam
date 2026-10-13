# Configure your own backend

This repository does not contain an existing deployment's configuration or data. Use a new Supabase project and keep its credentials outside Git.

1. Install Supabase CLI and Deno. From this directory, copy `.env.example` to `.env.local` and fill in only values for your own project.
2. Link to your own project with the Supabase CLI. Review the migrations before applying them with `supabase db push`. For local development use `supabase start` and `supabase db reset`. Automatic data seeding is disabled.
3. Store `ANTHROPIC_API_KEY` as an Edge Function secret using the Supabase dashboard or CLI's environment-file mechanism. Hosted Supabase functions receive their Supabase URL and service-role key from the platform. Never expose service-role or Anthropic credentials to the app.
4. Deploy the ordinary user-facing functions using your project's configuration. They validate user sessions in the shared auth helper. Configure Auth URLs and providers for your own app.
5. The app needs only your project URL and public anon key; put those in `app/.env.local`.

## Scheduled jobs

The migrations schedule SQL-only stuck-meal cleanup and rate-limit cleanup. They do not store secrets or schedule outbound HTTP requests.

To enable recap and image-retention cleanup, use your own scheduler to POST an empty JSON object to `/functions/v1/cron_daily_recap` every 30 minutes and `/functions/v1/cron_cleanup_expired_images` hourly. Both endpoints are under your Supabase project URL. Set a newly generated high-entropy `CRON_KEY` in the Edge Function secrets and store the same value only in the scheduler's secret store. Send it as the `Authorization: Bearer ...` header.

These two functions use their own `verifyCronKey` authentication, so configure gateway JWT verification off **only for these cron endpoints** when deploying them. Do not disable authentication checks in their code or use this setting for user-facing endpoints. No real key or deploy command containing a key belongs in a committed migration or shell history.

The previous deployment's outbound cron migration is intentionally absent. This source release is intended for a fresh deployment, not as an in-place migration upgrade for an existing installation.

## Before serving users

Validate the migrations, row-level access policies, storage permissions, upload flow, cron authentication, model responses and push delivery in a project you control. Configure retention and publish a privacy policy appropriate to that deployment. Nothing in this repository is a deployed service or a replacement for its operator's privacy policy.
