create extension if not exists pgcrypto;
create extension if not exists postgis;

create type entity_type as enum (
  'catalog_record',
  'physical_object',
  'object_part',
  'text_work',
  'text_witness',
  'text_edition',
  'inscription',
  'manuscript_unit',
  'place',
  'agent',
  'event',
  'asset'
);

create type record_kind as enum (
  'artifact',
  'inscription',
  'manuscript',
  'text',
  'collection',
  'archive'
);

create type date_precision as enum (
  'exact',
  'year',
  'range',
  'century',
  'circa',
  'unknown'
);

create type edition_type as enum (
  'transcription',
  'transliteration',
  'translation',
  'normalized_text',
  'commentary'
);

create type asset_kind as enum (
  'image',
  'pdf',
  'iiif_manifest',
  'scan',
  'derivative',
  'ocr',
  'other'
);

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table entities (
  id uuid primary key default gen_random_uuid(),
  type entity_type not null,
  slug text not null unique,
  preferred_label text not null,
  summary text,
  description text,
  editorial_status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entities_slug_not_blank check (length(trim(slug)) > 0),
  constraint entities_label_not_blank check (length(trim(preferred_label)) > 0)
);

create trigger entities_set_updated_at
before update on entities
for each row execute function set_updated_at();

create table places (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null unique references entities(id) on delete cascade,
  name text not null,
  place_type text,
  geom geometry(Geometry, 4326),
  modern_country text,
  ancient_region text,
  external_ids jsonb not null default '{}'::jsonb,
  certainty text,
  constraint places_name_not_blank check (length(trim(name)) > 0)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null unique references entities(id) on delete cascade,
  event_type text not null,
  date_start_year int,
  date_end_year int,
  date_label text,
  date_precision date_precision not null default 'unknown',
  place_id uuid references places(id) on delete set null,
  description text,
  constraint events_non_zero_start_year check (date_start_year is null or date_start_year <> 0),
  constraint events_non_zero_end_year check (date_end_year is null or date_end_year <> 0),
  constraint events_year_order check (
    date_start_year is null
    or date_end_year is null
    or date_start_year <= date_end_year
  )
);

create table agents (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null unique references entities(id) on delete cascade,
  agent_type text not null,
  name text not null,
  external_ids jsonb not null default '{}'::jsonb,
  constraint agents_name_not_blank check (length(trim(name)) > 0)
);

create table event_agents (
  event_id uuid not null references events(id) on delete cascade,
  agent_id uuid not null references agents(id) on delete cascade,
  role text not null,
  primary key (event_id, agent_id, role)
);

create table bibliographic_items (
  id uuid primary key default gen_random_uuid(),
  csl_json jsonb not null,
  short_label text,
  doi text,
  url text
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null unique references entities(id) on delete cascade,
  asset_kind asset_kind not null,
  bucket text not null,
  object_key text not null,
  original_filename text,
  content_type text,
  byte_size bigint,
  sha256 text,
  width int,
  height int,
  page_count int,
  source_url text,
  license text,
  rights_statement text,
  attribution text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  constraint assets_bucket_not_blank check (length(trim(bucket)) > 0),
  constraint assets_key_not_blank check (length(trim(object_key)) > 0),
  constraint assets_unique_storage_object unique (bucket, object_key),
  constraint assets_positive_byte_size check (byte_size is null or byte_size >= 0),
  constraint assets_positive_width check (width is null or width > 0),
  constraint assets_positive_height check (height is null or height > 0),
  constraint assets_positive_page_count check (page_count is null or page_count > 0)
);

create table catalog_records (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null unique references entities(id) on delete cascade,
  kind record_kind not null,
  display_title text not null,
  display_subtitle text,
  public_summary text,
  atlas_weight int not null default 5,
  primary_place_id uuid references places(id) on delete set null,
  primary_date_start_year int,
  primary_date_end_year int,
  primary_date_label text,
  discovery_event_id uuid references events(id) on delete set null,
  hero_asset_id uuid references assets(id) on delete set null,
  published boolean not null default false,
  constraint catalog_records_title_not_blank check (length(trim(display_title)) > 0),
  constraint catalog_records_weight_range check (atlas_weight between 1 and 10),
  constraint catalog_records_non_zero_start_year check (
    primary_date_start_year is null or primary_date_start_year <> 0
  ),
  constraint catalog_records_non_zero_end_year check (
    primary_date_end_year is null or primary_date_end_year <> 0
  ),
  constraint catalog_records_year_order check (
    primary_date_start_year is null
    or primary_date_end_year is null
    or primary_date_start_year <= primary_date_end_year
  )
);

create table physical_objects (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null unique references entities(id) on delete cascade,
  object_type text,
  material text,
  technique text,
  dimensions jsonb,
  condition_note text,
  production_event_id uuid references events(id) on delete set null,
  is_composite boolean not null default false
);

create table holdings (
  id uuid primary key default gen_random_uuid(),
  physical_object_id uuid not null references physical_objects(id) on delete cascade,
  repository_agent_id uuid references agents(id) on delete set null,
  collection_name text,
  inventory_number text,
  holding_status text,
  date_start_year int,
  date_end_year int,
  note text,
  constraint holdings_non_zero_start_year check (date_start_year is null or date_start_year <> 0),
  constraint holdings_non_zero_end_year check (date_end_year is null or date_end_year <> 0),
  constraint holdings_year_order check (
    date_start_year is null
    or date_end_year is null
    or date_start_year <= date_end_year
  )
);

alter table physical_objects
add column current_holding_id uuid references holdings(id) on delete set null;

create table catalog_record_links (
  catalog_record_id uuid not null references catalog_records(id) on delete cascade,
  entity_id uuid not null references entities(id) on delete cascade,
  role text not null,
  sequence int not null default 0,
  primary key (catalog_record_id, entity_id, role)
);

create table object_parts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null unique references entities(id) on delete cascade,
  physical_object_id uuid not null references physical_objects(id) on delete cascade,
  parent_part_id uuid references object_parts(id) on delete cascade,
  part_type text,
  label text,
  sequence int,
  material text,
  condition_note text
);

create table manuscript_units (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null unique references entities(id) on delete cascade,
  physical_object_id uuid not null references physical_objects(id) on delete cascade,
  support text,
  format text,
  script_summary text,
  language_summary text,
  folio_count int,
  quire_structure text,
  layout_note text,
  scribal_note text,
  constraint manuscript_units_positive_folio_count check (folio_count is null or folio_count > 0)
);

create table inscriptions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null unique references entities(id) on delete cascade,
  physical_object_id uuid not null references physical_objects(id) on delete cascade,
  object_part_id uuid references object_parts(id) on delete set null,
  inscription_type text,
  technique text,
  script text,
  language text,
  layout_note text,
  condition_note text
);

create table text_works (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null unique references entities(id) on delete cascade,
  canonical_title text not null,
  work_type text,
  language_original text,
  date_start_year int,
  date_end_year int,
  date_label text,
  abstract text,
  constraint text_works_title_not_blank check (length(trim(canonical_title)) > 0),
  constraint text_works_non_zero_start_year check (date_start_year is null or date_start_year <> 0),
  constraint text_works_non_zero_end_year check (date_end_year is null or date_end_year <> 0),
  constraint text_works_year_order check (
    date_start_year is null
    or date_end_year is null
    or date_start_year <= date_end_year
  )
);

create table text_witnesses (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null unique references entities(id) on delete cascade,
  text_work_id uuid references text_works(id) on delete cascade,
  physical_object_id uuid references physical_objects(id) on delete set null,
  inscription_id uuid references inscriptions(id) on delete set null,
  manuscript_unit_id uuid references manuscript_units(id) on delete set null,
  siglum text,
  witness_type text,
  completeness text,
  language text,
  script text,
  date_start_year int,
  date_end_year int,
  date_label text,
  constraint text_witnesses_has_carrier check (
    physical_object_id is not null
    or inscription_id is not null
    or manuscript_unit_id is not null
  ),
  constraint text_witnesses_non_zero_start_year check (date_start_year is null or date_start_year <> 0),
  constraint text_witnesses_non_zero_end_year check (date_end_year is null or date_end_year <> 0),
  constraint text_witnesses_year_order check (
    date_start_year is null
    or date_end_year is null
    or date_start_year <= date_end_year
  )
);

create table text_editions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null unique references entities(id) on delete cascade,
  text_witness_id uuid not null references text_witnesses(id) on delete cascade,
  edition_type edition_type not null,
  language text,
  script text,
  editorial_policy text,
  source_bibliography_id uuid references bibliographic_items(id) on delete set null,
  version_label text,
  is_public boolean not null default false
);

create table text_units (
  id uuid primary key default gen_random_uuid(),
  text_edition_id uuid not null references text_editions(id) on delete cascade,
  parent_unit_id uuid references text_units(id) on delete cascade,
  object_part_id uuid references object_parts(id) on delete set null,
  unit_type text not null,
  label text,
  sequence int not null,
  content text,
  normalized_content text,
  note text
);

create table text_annotations (
  id uuid primary key default gen_random_uuid(),
  text_unit_id uuid not null references text_units(id) on delete cascade,
  annotation_type text not null,
  start_offset int,
  end_offset int,
  content text,
  certainty text,
  created_at timestamptz not null default now(),
  constraint text_annotations_non_negative_start check (start_offset is null or start_offset >= 0),
  constraint text_annotations_non_negative_end check (end_offset is null or end_offset >= 0),
  constraint text_annotations_offset_order check (
    start_offset is null
    or end_offset is null
    or start_offset <= end_offset
  )
);

create table asset_links (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  entity_id uuid not null references entities(id) on delete cascade,
  role text not null,
  caption text,
  sequence int not null default 0,
  unique (asset_id, entity_id, role)
);

create table asset_regions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  page_number int,
  entity_id uuid references entities(id) on delete cascade,
  text_unit_id uuid references text_units(id) on delete cascade,
  x numeric,
  y numeric,
  width numeric,
  height numeric,
  coordinate_system text not null default 'normalized_0_1',
  label text,
  constraint asset_regions_has_target check (entity_id is not null or text_unit_id is not null),
  constraint asset_regions_positive_page check (page_number is null or page_number > 0),
  constraint asset_regions_positive_width check (width is null or width >= 0),
  constraint asset_regions_positive_height check (height is null or height >= 0)
);

create table citations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references entities(id) on delete cascade,
  text_unit_id uuid references text_units(id) on delete cascade,
  bibliographic_item_id uuid not null references bibliographic_items(id) on delete cascade,
  locator text,
  role text,
  note text,
  constraint citations_has_target check (entity_id is not null or text_unit_id is not null)
);

create table external_identifiers (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id) on delete cascade,
  scheme text not null,
  value text not null,
  url text,
  unique (entity_id, scheme, value)
);

create table entity_relations (
  id uuid primary key default gen_random_uuid(),
  subject_entity_id uuid not null references entities(id) on delete cascade,
  predicate text not null,
  object_entity_id uuid references entities(id) on delete cascade,
  object_label text,
  object_url text,
  certainty text,
  note text,
  bibliographic_item_id uuid references bibliographic_items(id) on delete set null,
  constraint entity_relations_has_object check (
    object_entity_id is not null
    or object_label is not null
    or object_url is not null
  )
);

create view atlas_source_cards as
select
  cr.id,
  e.slug,
  cr.display_title as label,
  cr.kind,
  coalesce(cr.public_summary, e.summary) as summary,
  coalesce(p.ancient_region, p.modern_country) as region,
  p.name as location_label,
  case
    when p.geom is null then null
    else st_y(st_transform(st_pointonsurface(p.geom), 4326))
  end as latitude,
  case
    when p.geom is null then null
    else st_x(st_transform(st_pointonsurface(p.geom), 4326))
  end as longitude,
  cr.primary_date_label as source_date_label,
  cr.primary_date_start_year as source_year,
  ev.date_label as discovery_date_label,
  ev.date_start_year as discovery_year,
  repo.name as current_repository,
  cr.atlas_weight as importance,
  case
    when hero.id is null or hero.is_public = false then null
    else '/api/assets/' || hero.id::text || '/file'
  end as hero_asset_url
from catalog_records cr
join entities e on e.id = cr.entity_id
left join places p on p.id = cr.primary_place_id
left join events ev on ev.id = cr.discovery_event_id
left join assets hero on hero.id = cr.hero_asset_id
left join catalog_record_links primary_object_link
  on primary_object_link.catalog_record_id = cr.id
  and primary_object_link.role = 'primary_physical_object'
left join physical_objects po on po.entity_id = primary_object_link.entity_id
left join holdings h on h.id = po.current_holding_id
left join agents repo on repo.id = h.repository_agent_id
where cr.published = true;

create index entities_slug_idx on entities (slug);
create index entities_type_idx on entities (type);
create index catalog_records_kind_idx on catalog_records (kind);
create index catalog_records_published_idx on catalog_records (published);
create index catalog_records_primary_date_start_year_idx on catalog_records (primary_date_start_year);
create index catalog_record_links_entity_id_idx on catalog_record_links (entity_id);
create index places_geom_gist_idx on places using gist (geom);
create index events_place_id_idx on events (place_id);
create index physical_objects_current_holding_id_idx on physical_objects (current_holding_id);
create index holdings_physical_object_id_idx on holdings (physical_object_id);
create index holdings_repository_agent_id_idx on holdings (repository_agent_id);
create index object_parts_physical_object_id_idx on object_parts (physical_object_id);
create index manuscript_units_physical_object_id_idx on manuscript_units (physical_object_id);
create index inscriptions_physical_object_id_idx on inscriptions (physical_object_id);
create index text_witnesses_text_work_id_idx on text_witnesses (text_work_id);
create index text_editions_text_witness_id_idx on text_editions (text_witness_id);
create index text_units_text_edition_id_idx on text_units (text_edition_id);
create index text_units_parent_unit_id_idx on text_units (parent_unit_id);
create index assets_sha256_idx on assets (sha256);
create index asset_links_entity_id_idx on asset_links (entity_id);
create index asset_regions_asset_id_idx on asset_regions (asset_id);
create index citations_entity_id_idx on citations (entity_id);
create index external_identifiers_entity_id_idx on external_identifiers (entity_id);
create index entity_relations_subject_entity_id_idx on entity_relations (subject_entity_id);
create index entity_relations_object_entity_id_idx on entity_relations (object_entity_id);

create index entities_search_idx on entities using gin (
  to_tsvector(
    'simple',
    coalesce(preferred_label, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(description, '')
  )
);

create index catalog_records_search_idx on catalog_records using gin (
  to_tsvector(
    'simple',
    coalesce(display_title, '') || ' ' || coalesce(display_subtitle, '') || ' ' || coalesce(public_summary, '')
  )
);

create index text_units_search_idx on text_units using gin (
  to_tsvector('simple', coalesce(content, '') || ' ' || coalesce(normalized_content, ''))
);

create index bibliographic_items_search_idx on bibliographic_items using gin (
  to_tsvector('simple', coalesce(short_label, '') || ' ' || coalesce(csl_json::text, ''))
);
