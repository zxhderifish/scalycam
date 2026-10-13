# Third-party notices

The root MIT License covers the owner's ScalyCam code. It does not change the terms of dependencies or copied template material.

## Expo template

The pre-existing Expo MIT copyright and license text is retained, unchanged, in `app/LICENSE`:

Copyright (c) 2015-present 650 Industries, Inc. (aka Expo).

## Dependencies

`app/package-lock.json` retains exact dependency versions, resolved public registry URLs, integrity values and license metadata. `THIRD_PARTY_LICENSES.json` is an inventory generated from that lockfile. Dependency source and build artifacts are not vendored in this repository. Their package distributions contain the applicable license texts; preserve those texts and notices when redistributing a compiled application or vendored dependencies.

The inventory includes MIT, ISC, Apache-2.0, BSD, MPL-2.0, CC-BY-4.0 and other license expressions. In particular, the Sentry CLI packages declare **FSL-1.1-MIT**, which is not a blanket MIT grant for the currently pinned versions. Their terms remain applicable; ScalyCam's MIT license does not override them.

Backend runtime imports include `@supabase/supabase-js`, `@anthropic-ai/sdk`, ImageScript and Deno's standard assertion library. They are fetched separately from their public distribution sources and retain their upstream licenses. Review the resolved versions and their notices when packaging a backend release. The existing backend uses some floating npm import versions; a deployment should pin and verify its runtime dependency set.

The bundled geometric icons were generated specifically for this public release and are covered by the root MIT license. No original photos or design-board images are included.
