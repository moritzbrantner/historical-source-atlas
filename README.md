# Historical Source Atlas

A small React site for exploring where historical texts, artifacts, inscriptions, and manuscripts entered the record.

## Stack

- Bun
- Vite
- React
- TypeScript
- Tailwind CSS v4
- React Query
- Storybook
- Playwright
- Axe
- `@moritzbrantner/maps`
- `@moritzbrantner/ui`
- `oxfmt`

## Development

```bash
bun install
bun run dev
bun run storybook
```

This repository expects the sibling `../maps` checkout to be present. In this workspace, `node_modules` is symlinked to `../maps/node_modules`, and `@moritzbrantner/maps` resolves to the sibling maps repository.

## Code Organization

The React app is split by responsibility:

- `src/app` owns providers and lightweight browser-history routing.
- `src/entities/source` owns source types, constants, static repository data, React Query hooks, and pure source utilities.
- `src/features/atlas` owns the atlas page, map, filters, timeline, sidebar, and atlas view model.
- `src/features/source-detail` owns source detail pages and related source context.
- `src/shared` holds small cross-feature helpers and UI wrappers.

The current atlas data remains static, but it is accessed through async repository functions and React Query. That boundary matches the documented future API shape so the repository implementation can later be swapped for HTTP fetchers.

## Quality Checks

```bash
bun run format
bun run check-types
bun run build
bun run build-storybook
bun run verify
```

`oxfmt` is configured in `.oxfmtrc.json`. `docker-compose.yml` is ignored so its existing compose quote style stays unchanged.

Vitest tests are colocated beside the code they cover as `*.test.ts` or `*.test.tsx`.
Playwright tests are also colocated under `src` as `*.e2e.ts`. E2E accessibility checks use Axe and fail on serious or critical violations.

## Data Model

The scholarly database model is implemented in `db/migrations/001_initial_schema.sql`.
It targets Postgres with PostGIS and S3-compatible object storage such as MinIO.

Local database/storage services are defined in `docker-compose.yml`; see
`docs/data-model.md` for migration, seed, and read-model details.
