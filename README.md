# Historical Source Atlas

Historical Source Atlas is a Next.js 16 research application for exploring historical sources, places, dates, references, and evidence. The working v1 atlas coexists with an emerging evidence-first historical model v2.

## Atlas routes

- `/` redirects to the default locale's `/[locale]/atlas`.
- `/[locale]/atlas`: map, timeline, filters, and source list.
- `/[locale]/atlas/sources/[slug]`: source detail, with comparison and reference-network subpages.
- `/[locale]/atlas/entities/[slug]` and typed entity paths: historical-entity context.
- `/sources/[slug]`: compatibility redirect, not the canonical path.
- `/api/atlas/sources`, `/api/atlas/entities`, and related `/api/atlas/**` routes: full-stack atlas API.
- `/api/atlas/v2/sources/[slug]/projection`: initial v2 source projection; most public UI still uses v1.

The Next.js foundation also contains account/admin routes and an inherited `apps/showcase` pack. These are infrastructure, not the primary atlas product.

## Local development

Use Bun 1.4.2, as declared in `package.json`:

```bash
cp .env.example .env
bun install --frozen-lockfile
bun run dev
```

For persistent services:

```bash
bun run services:up
bun run db:migrate
bun run db:atlas:migrate
bun run db:seed:test-users
bun run db:atlas:seed
bun run dev:app
```

The default local database is `historical_source_atlas` on port `55434`. Atlas SQL migrations and fixtures live under `db/atlas/`, separate from inherited Drizzle schema.

## Runtime layout and data modes

- `app/`: Next.js App Router pages, redirects, and route handlers.
- `src/atlas/`: atlas v1/v2 domain, features, repositories, adapters, and tests.
- `db/atlas/`: atlas SQL schema and static fixtures.
- `src/domain/`, `src/db/`, `apps/showcase/`, and `packages/app-pack*/`: inherited platform services.
- `app.manifest.ts`: standalone scaffold tooling metadata, not a historical-domain manifest.

Full-stack deployments load atlas data through HTTP/DB repositories; GitHub Pages uses `NEXT_PUBLIC_ATLAS_DATA_MODE=static` to read bundled source records (static exports cannot serve Next.js API routes).

```bash
NEXT_DEPLOY_TARGET=gh-pages GITHUB_PAGES_BASE_PATH=/historical-source-atlas bun run build:gh-pages
```

## Checks

```bash
bun run format:check
bun run lint
bun run typecheck
bun run test:unit
bun run test:integration
bun run storybook:build
bun run test:storybook
bun run build
bun run build:gh-pages
```

`bun run verify` also runs broader Docker-backed e2e checks; see [development](docs/development.md).

## Canonical documentation

- [Product brief](PRODUCT_BRIEF.md), [feature status](FEATURES.md)
- [Architecture](ARCHITECTURE.md), [domain context](CONTEXT.md), [domain guidance](docs/agents/domain.md)
- [Accepted decisions and open questions](DECISIONS.md), [v2 PRD #4](https://github.com/moritzbrantner/historical-source-atlas/issues/4)
- [Migration notes](MIGRATION_NOTES.md), [v1 data-model guide](docs/atlas-data-model.md)
- [Platform boundaries](docs/platform-layout.md), [upstream maintenance](docs/updating-from-upstream.md)
