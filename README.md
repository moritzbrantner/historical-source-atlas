# Historical Source Atlas

Historical Source Atlas is a Next.js 16 full-stack atlas application for browsing historical source records, their locations, reference flows, and source detail pages.

This branch migrates the original Vite React atlas into the committed `next-template` runtime in place. The atlas UI now lives under `src/atlas`, public pages are served through the Next App Router, and source data is exposed through DB-backed API routes.

## Public Routes

- `/`: atlas map, source list, timeline, and filters
- `/sources/[slug]`: source detail page
- `/api/atlas/sources`: all atlas source records
- `/api/atlas/sources/[slug]`: one atlas source record or `404`

## Stack

- Next.js 16 App Router + React 19
- Bun workspaces
- PostgreSQL/PostGIS with Drizzle still available for template-owned schema
- Raw SQL atlas migrations and seed data under `db/atlas`
- TanStack Query for atlas client data loading
- Vitest + Playwright

## Local Setup

```bash
cp .env.example .env
bun install
bun run dev
```

`bun run dev` uses the template development flow. For long-lived local services, start compose and apply both the template and atlas database setup:

```bash
bun run services:up
bun run db:migrate
bun run db:atlas:migrate
bun run db:seed:test-users
bun run db:atlas:seed
bun run dev:app
```

The default local database is `historical_source_atlas` on port `55434`.

## Atlas Data

Atlas database assets are namespaced separately from the template schema:

- `db/atlas/migrations/001_initial_schema.sql`
- `db/atlas/migrations/002_referenced_entities.sql`
- `db/atlas/seeds/001_current_static_sources.sql`

The first migration milestone keeps the historical schema as raw Postgres/PostGIS SQL. Runtime reads are implemented in `src/atlas/server/atlasSourceRepository.ts` and exposed by the `/api/atlas/*` route handlers.

## Repository Layout

- `app.manifest.ts`: app metadata used by the inherited scaffold tooling
- `app/`: Next.js App Router pages and route handlers
- `src/atlas/`: atlas domain, features, client routes, tests, and server repository
- `src/db/`: template database client and Drizzle integration
- `db/atlas/`: atlas raw SQL migrations and seed data
- `packages/`: local scaffold support packages

## Checks

```bash
bun run format:check
bun run typecheck
bun run test:unit
bun run build
```

Atlas e2e coverage can be run directly:

```bash
bunx playwright test \
  src/atlas/features/atlas/AtlasPage.e2e.spec.ts \
  src/atlas/features/source-detail/SourcePage.e2e.spec.ts
```

The broader template confidence commands are still available through `bun run verify`, `bun run checks:beta`, and `bun run checks:main`.
