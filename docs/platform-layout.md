# Historical Source Atlas — Platform layout

The atlas owns historical research; the inherited Next.js foundation owns generic accounts, administration, localization, and app-pack support. Both currently deploy in one application but have distinct authority boundaries.

- `app/` contains all Next.js entrypoints. `app/[locale]/atlas/**` and `app/api/atlas/**` are atlas-owned.
- `src/atlas/**` owns atlas UI, domain, v1 compatibility, v2 projections, migration, and server adapters; do **not** treat all of `src/**` as foundation-owned.
- `src/db/**` is shared infrastructure; `db/atlas/**` owns atlas SQL and seeds.
- `src/domain/**`, `components/**`, `i18n/**`, and `messages/**` retain inherited or shared services.
- `apps/showcase/**` is selected by `app.config.ts`. Its examples are not the Historical Source Atlas product.
- `packages/app-pack/` and `packages/app-pack-react/` are local; shared `@moritzbrantner/ui` comes from npm.

## Two distinct manifests

- `app.manifest.ts` is repo/tooling metadata (`entryWorkspace: '.'`, Next.js deployment). It does not own app-pack or historical-domain semantics.
- `apps/showcase/manifest.ts` implements the internal `AppManifest` public page, locale, content-root, feature-gate, and example API contract. Foundation imports packs only through `src/app-config/load-active-app.ts`.
- The current `packageName: 'next-template'` and showcase `siteName: 'Next Template'` are legacy runtime metadata. Rebranding/removing them is **not** part of a documentation-only cleanup; see the open question in [DECISIONS.md](../DECISIONS.md).

## If app-pack maintenance is required

Create `apps/<name>/manifest.ts` implementing `AppManifest`, provide locale messages and MDX roots, add pack-local contract tests, and intentionally update `app.config.ts`. Keep optional example APIs feature-gated. A pack must not overwrite atlas domain logic or atlas routes. The atlas-specific exception to template ownership is authoritative; avoid copying the `next-template` hard rule that all `src/**` is foundation-owned.

See [architecture](../ARCHITECTURE.md), [updating from upstream](updating-from-upstream.md), and [domain guidance](agents/domain.md).
