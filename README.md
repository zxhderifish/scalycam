# ScalyCam

A React Native / Expo app for tracking body weight, meals and estimated nutrition, with Bluetooth support for a compatible camera-equipped kitchen scale. The backend uses Supabase Auth, Postgres, Storage and Deno Edge Functions; meal recognition uses the Anthropic API.

This is a source-only public release with a fresh Git history. It contains no personal health records, deployed service credentials, device photos or original deployment configuration. Tests use explicitly synthetic inputs; bundled icons are newly generated geometric graphics.

## Layout

- `app/` — Expo SDK 56 app, onboarding, meal history, weight charts and BLE integration.
- `backend/supabase/` — database schema, access policies and Edge Functions.
- `backend/prompts/` — recognition and nutrition prompts.
- `backend/DEPLOYMENT.md` — configuring your own backend.

Compatible scale firmware and hardware are not included. BLE and native storage require a native development build; Expo Go and a browser do not provide the complete device workflow.

## App setup

Use Node.js 20.19 or later and npm. The release was checked with Node.js 25.

```sh
cd app
npm ci --ignore-scripts
cp .env.example .env.local
# Edit .env.local with your own Supabase URL and public anon key.
npm start
```

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for your own project. Never put a service-role key or other server credential in an `EXPO_PUBLIC_*` variable: those values are bundled into the app. Optional `EXPO_PUBLIC_POSTHOG_KEY` enables analytics; leaving it unset disables analytics initialization.

`app.json` uses the placeholder identifier `org.example.scalycam`. Choose your own iOS bundle ID and Android package before making a native build. `eas.json` includes generic build profiles without an Apple account, team, App Store ID or EAS project ID. Configure your own signing and build account locally. The initial dependency install above skips lifecycle scripts; a particular native build tool may require its documented local setup.

## Checks

```sh
cd app
npm test
npm run typecheck
```

Backend normalization checks, with Deno installed:

```sh
cd backend
# Downloads the pinned public assertion library; no backend credentials required.
deno test supabase/functions/_shared/normalize_test.ts
```

Native device pairing, push notifications, real model calls, migrations against a live database and store signing require your own infrastructure and device testing. This source release does not deploy or configure them automatically. See `VALIDATION.md` for release checks and known limitations.

## Data and configuration

The app starts without seeded user records. Old design mockups, deployment-specific documents and data seeds are excluded. The nutrition tests contain invented arithmetic fixtures; they are not a diet recommendation or a record of a real person. The app's estimates require review before relying on them.

Do not commit populated environment files, personal exports, backups, uploads or device photos. Local exclusions are listed in `.gitignore`. Review staged files before every contribution; an ignore file alone cannot detect secrets embedded in source.

## License

Original ScalyCam application and backend code is available under the [MIT License](LICENSE), copyright 2026 zxhderifish. This replaces the earlier proprietary designation for the owner's code in this public release.

Third-party code and dependencies retain their own licenses. The Expo template's existing copyright and MIT notice is preserved in [app/LICENSE](app/LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the dependency license inventory; the root MIT grant does not relicense those components.
