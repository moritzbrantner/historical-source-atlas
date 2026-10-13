# Historical Source Atlas — Architecture

## Product and runtime

Historical Source Atlas is a Next.js 16 App Router research application, not a reusable platform template. It owns historical-source discovery and evidence interpretation; the inherited foundation supplies authentication, administration, localization, content, and account utilities.

- `app/page.tsx` redirects to the default-locale atlas page; `app/[locale]/atlas/**` contains the canonical localized atlas routes.
- `app/sources/[slug]/**` are compatibility redirects, not canonical detail pages.
- `app/api/atlas/**` owns HTTP contracts for atlas sources, entities, evidence, collections, tags, and v2 projections.
- `app.manifest.ts` is standalone scaffold metadata; `app.config.ts` selects the inherited `apps/showcase/manifest.ts`. Neither defines historical ontology.
- `src/atlas/**` owns atlas domain, feature UI, repositories, and migration; `src/domain/**` and `src/db/**` retain platform use cases and database infrastructure.

## Domain and evidence boundary

The functional v1 atlas still uses `EntityType`, `RecordKind`, taxonomy helpers, and compatibility storage. These are **not** the target historical ontology.

- `src/atlas/domain/v2/**` owns documentary, textual, historical, evidence/assertion/provenance, and digital-asset records, plus a kernel that validates references without collapsing disagreements.
- `src/atlas/domain/v2/projections/**` provides deterministic source/entity detail, map, timeline, search, and evidence-review read models.
- `src/atlas/migration/**` translates v1 snapshots into v2 through explicit adapters and diagnostics, rather than inventing missing historical evidence.
- `src/atlas/server/**` owns database and projection adapters. `db/atlas/**` owns v1 atlas SQL migrations and seeds, separate from inherited Drizzle schema.

```text
source -> observation/annotation -> assertion + provenance
       -> historical graph -> deterministic projection -> UI
```

The v2 kernel, projections, adapters, and initial DB-backed v2 source-projection API exist. Main atlas UI screens **still primarily consume v1** and the v2 UI cutover remains open. Consult [DEC-0004](DECISIONS.md), [domain context](CONTEXT.md), [domain guidance](docs/agents/domain.md), and [PRD #4](https://github.com/moritzbrantner/historical-source-atlas/issues/4) before changing historical modelling.

## UI, delivery, and tooling

- `src/atlas/features/**` owns atlas screens; `src/atlas/entities/**` owns client-facing repositories and query seams. Screens consume read models, not arbitrary truth selections from storage.
- `src/atlas/entities/source/api/clientSourceRepository.ts` selects HTTP/DB or bundled static data via `NEXT_PUBLIC_ATLAS_DATA_MODE`. GitHub Pages uses static data because a static export has no Next.js API.
- `components/` and `@moritzbrantner/ui` provide shared UI; keep atlas-specific behavior under `src/atlas/`.
- `i18n/` and `messages/` support localized routes. `apps/showcase/` and `packages/app-pack*/` remain supporting platform seams, not the atlas product.
- `.coding-tooling.json` declares the fast shared validation profile; DB, integration, Storybook, Pages, production build, and Playwright checks remain repository-specific.

Maintain v1/v2 compatibility during migration. Defer a general-purpose graph API. See [development](docs/development.md) and [platform layout](docs/platform-layout.md).
