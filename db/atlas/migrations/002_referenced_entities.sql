alter table agents
add column date_start_year int,
add column date_end_year int,
add column date_label text,
add column date_precision date_precision not null default 'unknown',
add constraint agents_non_zero_start_year check (date_start_year is null or date_start_year <> 0),
add constraint agents_non_zero_end_year check (date_end_year is null or date_end_year <> 0),
add constraint agents_year_order check (
  date_start_year is null
  or date_end_year is null
  or date_start_year <= date_end_year
);

create table entity_names (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id) on delete cascade,
  name text not null,
  name_type text not null default 'alias',
  language text,
  script text,
  is_primary boolean not null default false,
  source_note text,
  constraint entity_names_name_not_blank check (length(trim(name)) > 0),
  constraint entity_names_type_not_blank check (length(trim(name_type)) > 0),
  unique (entity_id, name, name_type, language, script)
);

create table entity_mentions (
  id uuid primary key default gen_random_uuid(),
  text_unit_id uuid not null references text_units(id) on delete cascade,
  entity_id uuid not null references entities(id) on delete cascade,
  mention_text text not null,
  start_offset int,
  end_offset int,
  certainty text,
  source text,
  note text,
  created_at timestamptz not null default now(),
  constraint entity_mentions_text_not_blank check (length(trim(mention_text)) > 0),
  constraint entity_mentions_non_negative_start check (start_offset is null or start_offset >= 0),
  constraint entity_mentions_non_negative_end check (end_offset is null or end_offset >= 0),
  constraint entity_mentions_offset_order check (
    start_offset is null
    or end_offset is null
    or start_offset <= end_offset
  )
);

create table historical_geometries (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities(id) on delete cascade,
  geom geometry(Geometry, 4326) not null,
  geometry_role text not null default 'attested_extent',
  date_start_year int,
  date_end_year int,
  date_label text,
  date_precision date_precision not null default 'unknown',
  certainty text,
  source_note text,
  constraint historical_geometries_role_not_blank check (length(trim(geometry_role)) > 0),
  constraint historical_geometries_non_zero_start_year check (
    date_start_year is null or date_start_year <> 0
  ),
  constraint historical_geometries_non_zero_end_year check (
    date_end_year is null or date_end_year <> 0
  ),
  constraint historical_geometries_year_order check (
    date_start_year is null
    or date_end_year is null
    or date_start_year <= date_end_year
  )
);

create table event_places (
  event_id uuid not null references events(id) on delete cascade,
  place_id uuid not null references places(id) on delete cascade,
  role text not null,
  certainty text,
  note text,
  primary key (event_id, place_id, role),
  constraint event_places_role_not_blank check (length(trim(role)) > 0)
);

create index agents_active_date_start_year_idx on agents (date_start_year);
create index entity_names_entity_id_idx on entity_names (entity_id);
create index entity_names_name_idx on entity_names (name);
create index entity_mentions_text_unit_id_idx on entity_mentions (text_unit_id);
create index entity_mentions_entity_id_idx on entity_mentions (entity_id);
create index historical_geometries_entity_id_idx on historical_geometries (entity_id);
create index historical_geometries_geom_gist_idx on historical_geometries using gist (geom);
create index event_places_place_id_idx on event_places (place_id);
