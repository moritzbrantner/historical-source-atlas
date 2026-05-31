# Historical Source Atlas Data Model

The database schema lives in [`db/migrations/001_initial_schema.sql`](../db/migrations/001_initial_schema.sql).
It implements the scholarly-core model for catalogue records, physical objects,
manuscripts, inscriptions, text works, witnesses, editions, media assets, places,
events, agents, bibliography, identifiers, and entity relationships.

## Local Services

Copy `.env.example` to `.env` if you want to override defaults, then start the
database and object storage:

```bash
docker compose up -d postgres minio minio-create-buckets
```

Or through the package script:

```bash
bun run services:up
```

Apply the schema:

```bash
docker compose exec -T postgres psql \
  -U atlas \
  -d historical_source_atlas \
  < db/migrations/001_initial_schema.sql

docker compose exec -T postgres psql \
  -U atlas \
  -d historical_source_atlas \
  < db/migrations/002_referenced_entities.sql
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
- `GET /api/atlas/sources/:slug/entities` returns `SourceEntityContext`.
- `GET /api/atlas/entities?query=&type=&kind=` returns `EntitySummary[]`.
- `GET /api/atlas/entities/:slug` returns `AtlasEntityDetail`.
- `GET /api/atlas/entities/:slug/sources` returns linked `AtlasSourceCard[]`.
- `GET /api/atlas/entities/:slug/mentions` returns `EntityMentionContext[]`.
- `GET /api/atlas/entities/:slug/relations` returns incoming and outgoing `EntityRelationView[]`.
- `GET /api/text-editions/:id/units` returns `TextUnit[]`.
- `GET /api/text-units/:id/entity-mentions` returns `EntityMention[]`.

## Referenced Entities

[`db/migrations/002_referenced_entities.sql`](../db/migrations/002_referenced_entities.sql)
adds the contract for people, cities, borders, events, and other referenced
objects that appear inside source text. It keeps the existing `entities` table
as the shared identity layer:

- People are `entities.type = 'agent'` with `agents.agent_type = 'person'`.
- Cities are `entities.type = 'place'` with `places.place_type = 'city'`.
- Borders are `entities.type = 'place'` with `places.place_type = 'border'`.
- Events are `entities.type = 'event'` with `events.event_type` describing
  the event kind.

The extension adds:

- `entity_names` for aliases, spelling variants, translations, and
  transliterations.
- `entity_mentions` for text-span links from `text_units` to `entities`.
- `historical_geometries` for dated place, border, region, route, and city
  geometry.
- `event_places` for events with multiple place roles.
- active-period date fields on `agents`.

Text offsets exposed through `EntityMention` use browser/JavaScript UTF-16
code-unit offsets.

## Referenced Entity Fixture

This example shows how to model a passage that references the death of Julius
Caesar in Rome. It is illustrative fixture SQL, not part of the static atlas
seed.

```sql
do $$
declare
  caesar_agent_id uuid;
  caesar_entity_id uuid;
  death_entity_id uuid;
  death_event_id uuid;
  edition_entity_id uuid;
  edition_id uuid;
  object_entity_id uuid;
  physical_object_id uuid;
  rome_entity_id uuid;
  rome_place_id uuid;
  text_unit_id uuid;
  witness_entity_id uuid;
  witness_id uuid;
  work_entity_id uuid;
  work_id uuid;
begin
  insert into entities (type, slug, preferred_label, summary, editorial_status)
  values ('agent', 'julius-caesar', 'Julius Caesar', 'Roman statesman and general.', 'published')
  returning id into caesar_entity_id;

  insert into agents (
    entity_id,
    agent_type,
    name,
    date_start_year,
    date_end_year,
    date_label,
    date_precision
  )
  values (caesar_entity_id, 'person', 'Julius Caesar', -100, -44, '100-44 BCE', 'range')
  returning id into caesar_agent_id;

  insert into entity_names (entity_id, name, name_type, language, is_primary)
  values (caesar_entity_id, 'Gaius Julius Caesar', 'full_name', 'la', true);

  insert into entities (type, slug, preferred_label, summary, editorial_status)
  values ('place', 'rome', 'Rome', 'City in central Italy.', 'published')
  returning id into rome_entity_id;

  insert into places (
    entity_id,
    name,
    place_type,
    geom,
    modern_country,
    ancient_region,
    certainty
  )
  values (
    rome_entity_id,
    'Rome',
    'city',
    st_setsrid(st_makepoint(12.4964, 41.9028), 4326),
    'Italy',
    'Latium',
    'modern coordinate for city center'
  )
  returning id into rome_place_id;

  insert into historical_geometries (
    entity_id,
    geom,
    geometry_role,
    date_start_year,
    date_end_year,
    date_label,
    date_precision,
    certainty
  )
  values (
    rome_entity_id,
    st_setsrid(st_makepoint(12.4964, 41.9028), 4326),
    'representative_point',
    -44,
    -44,
    '44 BCE',
    'year',
    'illustrative'
  );

  insert into entities (type, slug, preferred_label, summary, editorial_status)
  values (
    'event',
    'death-of-julius-caesar',
    'Death of Julius Caesar',
    'Assassination of Julius Caesar in 44 BCE.',
    'published'
  )
  returning id into death_entity_id;

  insert into events (
    entity_id,
    event_type,
    date_start_year,
    date_end_year,
    date_label,
    date_precision,
    place_id,
    description
  )
  values (
    death_entity_id,
    'death',
    -44,
    -44,
    '44 BCE',
    'year',
    rome_place_id,
    'Julius Caesar was assassinated in Rome.'
  )
  returning id into death_event_id;

  insert into event_agents (event_id, agent_id, role)
  values (death_event_id, caesar_agent_id, 'deceased');

  insert into event_places (event_id, place_id, role, certainty)
  values (death_event_id, rome_place_id, 'location', 'illustrative');

  insert into entities (type, slug, preferred_label, editorial_status)
  values ('text_work', 'caesar-reference-example-work', 'Caesar reference example', 'draft')
  returning id into work_entity_id;

  insert into text_works (entity_id, canonical_title, work_type)
  values (work_entity_id, 'Caesar reference example', 'fixture')
  returning id into work_id;

  insert into entities (type, slug, preferred_label, editorial_status)
  values ('physical_object', 'caesar-reference-example-object', 'Caesar reference example carrier', 'draft')
  returning id into object_entity_id;

  insert into physical_objects (entity_id, object_type)
  values (object_entity_id, 'fixture carrier')
  returning id into physical_object_id;

  insert into entities (type, slug, preferred_label, editorial_status)
  values ('text_witness', 'caesar-reference-example-witness', 'Caesar reference example witness', 'draft')
  returning id into witness_entity_id;

  insert into text_witnesses (entity_id, text_work_id, physical_object_id, witness_type)
  values (witness_entity_id, work_id, physical_object_id, 'fixture')
  returning id into witness_id;

  insert into entities (type, slug, preferred_label, editorial_status)
  values ('text_edition', 'caesar-reference-example-edition', 'Caesar reference example edition', 'draft')
  returning id into edition_entity_id;

  insert into text_editions (entity_id, text_witness_id, edition_type, is_public)
  values (edition_entity_id, witness_id, 'transcription', true)
  returning id into edition_id;

  insert into text_units (
    text_edition_id,
    unit_type,
    label,
    sequence,
    content,
    normalized_content
  )
  values (
    edition_id,
    'sentence',
    'Example sentence',
    1,
    'The death of Julius Caesar in Rome changed Roman politics.',
    'The death of Julius Caesar in Rome changed Roman politics.'
  )
  returning id into text_unit_id;

  insert into entity_mentions (
    text_unit_id,
    entity_id,
    mention_text,
    start_offset,
    end_offset,
    certainty,
    source
  )
  values
    (text_unit_id, death_entity_id, 'death of Julius Caesar', 4, 26, 'illustrative', 'manual_fixture'),
    (text_unit_id, caesar_entity_id, 'Julius Caesar', 13, 26, 'illustrative', 'manual_fixture'),
    (text_unit_id, rome_entity_id, 'Rome', 30, 34, 'illustrative', 'manual_fixture');
end $$;
```

Verify the fixture links all three text mentions:

```sql
select
  em.mention_text,
  e.type,
  e.preferred_label
from entity_mentions em
join entities e on e.id = em.entity_id
order by em.start_offset;
```

## Modeling Notes

`catalog_record_links` is intentionally included even though it was not named in
the original plan. It gives catalogue records explicit links to their primary
physical object, manuscript unit, inscription, or text work. Without it, the
database could not reliably derive repository holdings or detailed object/text
views from a top-level atlas record.

The `atlas_source_cards` view is the compatibility boundary. The frontend should
not need to know the full scholarly schema in order to render the map, list,
timeline, and detail summary.
