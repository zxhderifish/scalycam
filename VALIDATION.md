# Public release validation

Checks performed on 2026-10-13 using Node.js 25.7.0 and npm 11.10.1:

- `npm ci --ignore-scripts --no-audit --no-fund`: succeeded with the existing lockfile. npm reported inherited peer-version and deprecated-package warnings; no dependency upgrade or vulnerability audit is claimed.
- `npm test`: all 3 nutrition tests passed with newly authored synthetic profiles.
- `npm run typecheck`: passed after adding a CSS module declaration.
- Expo's iOS JavaScript/Hermes export: succeeded, bundling 1,954 modules with inert placeholder backend settings. This is not a native signed iOS build. Output was kept outside the source repository.
- Backend normalization: all 4 synthetic string cases passed with Node.js native TypeScript stripping. Deno was not installed, so execution under Deno remains to be verified.
- Source inspection: private deployment identifiers and credentials were removed; no old Git history, old images, populated environment files, personal records, backups or generated bundles are included. Old design documents and data seeds are excluded. Dependency metadata and the Expo template notice are retained.

Not exercised: database migrations against a live Supabase project, user registration, model calls, device Bluetooth pairing, native storage, notifications, EAS signing, Android native compilation or any production deployment. No production credential was rotated or used during these checks. The hardware protocol and application behavior need device/integration testing before relying on a deployment.

The app and backend remain a development project. A successful source export and unit tests do not establish production readiness. Optional telemetry, data retention and deployment privacy policy need to be configured by each operator.
