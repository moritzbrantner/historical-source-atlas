# Historical Source Atlas Data Model

The database schema lives in [`db/migrations/001_initial_schema.sql`](../db/migrations/001_initial_schema.sql).
It implements the scholarly-core model for catalogue records, physical objects,
manuscripts, inscriptions, text works, witnesses, editions, media assets, places,
events, agents, bibliography, identifiers, and entity relationships.

## Local Services

Copy `.env.example` to `.env` if you want to override defaults, then start the
database and object storage:

```bash
docker compose up -d postgres minio
```

Or through the package script, which also creates the default MinIO buckets:

```bash
bun run db:up
```

Apply the schema:

```bash
docker compose exec -T postgres psql \
  -U atlas \
  -d historical_source_atlas \
  < db/migrations/001_initial_schema.sql
```

Load the current static atlas records:

```bash
docker compose exec -T postgres psql \
  -U atlas \
  -d historical_source_atlas \
  < db/seeds/001_current_static_sources.sql
```

Query the read model used by the React atlas:

```sql
select *
from atlas_source_cards
order by source_year;
```

## Storage

MinIO is configured as S3-compatible storage. The schema stores object metadata
only; application code should generate signed or public URLs.

Default buckets:

- `source-originals`: private original uploads.
- `source-public`: public web-ready assets.
- `source-derivatives`: thumbnails, previews, OCR output, and derived files.

## Frontend Contract

[`src/domain/dataModel.ts`](../src/domain/dataModel.ts) defines the TypeScript
contract for the database-backed API, including `AtlasSourceCard`.

[`src/domain/atlasReadModel.ts`](../src/domain/atlasReadModel.ts) maps the
current static `historicalSources` into that read model. This keeps the existing
frontend stable while the backend API is introduced.

Initial API endpoints should return these shapes:

- `GET /api/atlas/sources` returns `AtlasSourceCard[]`.
- `GET /api/atlas/sources/:slug` returns one `AtlasSourceCard` plus detail data.
- `GET /api/entities/:id/assets` returns `Asset[]`.
- `GET /api/entities/:id/relations` returns `EntityRelation[]`.
- `GET /api/text-editions/:id/units` returns `TextUnit[]`.

## Modeling Notes

`catalog_record_links` is intentionally included even though it was not named in
the original plan. It gives catalogue records explicit links to their primary
physical object, manuscript unit, inscription, or text work. Without it, the
database could not reliably derive repository holdings or detailed object/text
views from a top-level atlas record.

The `atlas_source_cards` view is the compatibility boundary. The frontend should
not need to know the full scholarly schema in order to render the map, list,
timeline, and detail summary.
