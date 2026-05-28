# Historical Source Atlas

A small React site for exploring where historical texts, artifacts, inscriptions, and manuscripts entered the record.

## Stack

- Vite
- React
- TypeScript
- `@moritzbrantner/maps`
- `@moritzbrantner/ui`

## Development

```bash
bun run dev
```

This repository expects the sibling `../maps` checkout to be present. In this workspace, `node_modules` is symlinked to `../maps/node_modules`, and `@moritzbrantner/maps` resolves to the sibling maps repository.

## Data Model

The scholarly database model is implemented in `db/migrations/001_initial_schema.sql`.
It targets Postgres with PostGIS and S3-compatible object storage such as MinIO.

Local database/storage services are defined in `docker-compose.yml`; see
`docs/data-model.md` for migration, seed, and read-model details.
