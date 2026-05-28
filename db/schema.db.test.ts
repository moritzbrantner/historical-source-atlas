import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { historicalSources } from "../src/entities/source/api/staticSourceData";
import { applySqlFile, closeDb, query, resetDatabase } from "./test/dbTestClient";

describe("database schema and seed", () => {
  beforeAll(async () => {
    await resetDatabase();
    await applySqlFile("db/migrations/001_initial_schema.sql");
    await applySqlFile("db/migrations/002_referenced_entities.sql");
    await applySqlFile("db/seeds/001_current_static_sources.sql");
  });

  afterAll(async () => {
    await closeDb();
  });

  it("creates required extensions", async () => {
    const result = await query<{ extname: string }>(
      "select extname from pg_extension where extname in ('pgcrypto', 'postgis') order by extname",
    );

    expect(result.rows.map((row) => row.extname)).toEqual(["pgcrypto", "postgis"]);
  });

  it("creates expected enum types", async () => {
    const result = await query<{ typname: string }>(`
      select typname
      from pg_type
      where typname in ('entity_type', 'record_kind', 'date_precision', 'edition_type', 'asset_kind')
      order by typname
    `);

    expect(result.rows.map((row) => row.typname)).toEqual([
      "asset_kind",
      "date_precision",
      "edition_type",
      "entity_type",
      "record_kind",
    ]);
  });

  it("creates expected core tables and atlas view", async () => {
    const tables = await query<{ table_name: string }>(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in (
          'entities',
          'places',
          'events',
          'agents',
          'catalog_records',
          'physical_objects',
          'holdings',
          'entity_relations',
          'entity_names',
          'entity_mentions',
          'historical_geometries',
          'event_places'
        )
      order by table_name
    `);
    const views = await query<{ table_name: string }>(`
      select table_name
      from information_schema.views
      where table_schema = 'public' and table_name = 'atlas_source_cards'
    `);

    expect(tables.rows.map((row) => row.table_name)).toEqual([
      "agents",
      "catalog_records",
      "entities",
      "entity_mentions",
      "entity_names",
      "entity_relations",
      "event_places",
      "events",
      "historical_geometries",
      "holdings",
      "physical_objects",
      "places",
    ]);
    expect(views.rows).toHaveLength(1);
  });

  it("seeds one atlas card per static source and is idempotent", async () => {
    await expect(applySqlFile("db/seeds/001_current_static_sources.sql")).resolves.toBeUndefined();

    const result = await query<{ count: string }>("select count(*) from atlas_source_cards");

    expect(Number(result.rows[0]!.count)).toBe(historicalSources.length);
  });

  it("returns expected data for dead-sea-scrolls", async () => {
    const result = await query<{
      current_repository: string;
      discovery_year: number;
      importance: number;
      kind: string;
      label: string;
      latitude: number;
      longitude: number;
      source_year: number;
    }>(
      "select label, kind, discovery_year, source_year, current_repository, latitude, longitude, importance from atlas_source_cards where slug = $1",
      ["dead-sea-scrolls"],
    );

    expect(result.rows[0]).toMatchObject({
      current_repository: "Israel Museum, Shrine of the Book and other collections",
      discovery_year: 1947,
      importance: 10,
      kind: "manuscript",
      label: "Dead Sea Scrolls",
      source_year: -300,
    });
    expect(Number(result.rows[0]!.latitude)).toBeCloseTo(31.741, 3);
    expect(Number(result.rows[0]!.longitude)).toBeCloseTo(35.458, 3);
  });

  it("returns complete atlas rows for seeded data", async () => {
    const result = await query<{
      bad_rows: string;
      out_of_range_importance: string;
    }>(`
      select
        count(*) filter (
          where slug is null
            or length(trim(slug)) = 0
            or label is null
            or length(trim(label)) = 0
            or latitude is null
            or longitude is null
        ) as bad_rows,
        count(*) filter (where importance not between 1 and 10) as out_of_range_importance
      from atlas_source_cards
    `);

    expect(Number(result.rows[0]!.bad_rows)).toBe(0);
    expect(Number(result.rows[0]!.out_of_range_importance)).toBe(0);
  });

  it("excludes unpublished catalog records from atlas_source_cards", async () => {
    await query(`
      with entity as (
        insert into entities (type, slug, preferred_label)
        values ('catalog_record', 'unpublished-test-record', 'Unpublished Test Record')
        returning id
      )
      insert into catalog_records (entity_id, kind, display_title, atlas_weight, published)
      select id, 'text', 'Unpublished Test Record', 5, false
      from entity
    `);

    const result = await query<{ count: string }>(
      "select count(*) from atlas_source_cards where slug = 'unpublished-test-record'",
    );

    expect(Number(result.rows[0]!.count)).toBe(0);
  });

  it("rejects invalid schema examples", async () => {
    await expectRejected(
      "insert into entities (type, slug, preferred_label) values ('place', '', 'No')",
    );
    await expectRejected(`
      with entity as (
        insert into entities (type, slug, preferred_label)
        values ('catalog_record', 'bad-weight-record', 'Bad Weight Record')
        returning id
      )
      insert into catalog_records (entity_id, kind, display_title, atlas_weight)
      select id, 'text', 'Bad Weight Record', 0
      from entity
    `);
    await expectRejected(`
      with entity as (
        insert into entities (type, slug, preferred_label)
        values ('event', 'bad-year-order-event', 'Bad Year Order Event')
        returning id
      )
      insert into events (entity_id, event_type, date_start_year, date_end_year)
      select id, 'test', 200, 100
      from entity
    `);
    await expectRejected(`
      with entity as (
        insert into entities (type, slug, preferred_label)
        values ('event', 'bad-zero-year-event', 'Bad Zero Year Event')
        returning id
      )
      insert into events (entity_id, event_type, date_start_year)
      select id, 'test', 0
      from entity
    `);
    await expectRejected(`
      with entity as (
        insert into entities (type, slug, preferred_label)
        values ('asset', 'bad-asset', 'Bad Asset')
        returning id
      )
      insert into assets (entity_id, asset_kind, bucket, object_key, width)
      select id, 'image', 'bucket', 'bad-asset.jpg', -1
      from entity
    `);
    await expectRejected(`
      insert into entity_relations (subject_entity_id, predicate)
      select id, 'invalid'
      from entities
      where slug = 'dead-sea-scrolls'
    `);
  });

  it("cascades catalog records when deleting their entity", async () => {
    const seededRecord = await query<{ catalog_record_id: string; entity_id: string }>(`
      select cr.id as catalog_record_id, cr.entity_id
      from catalog_records cr
      join entities e on e.id = cr.entity_id
      where e.slug = 'dead-sea-scrolls'
    `);
    const { catalog_record_id, entity_id } = seededRecord.rows[0]!;

    await query("delete from entities where id = $1", [entity_id]);

    const result = await query<{ count: string }>(
      "select count(*) from catalog_records where id = $1",
      [catalog_record_id],
    );

    expect(Number(result.rows[0]!.count)).toBe(0);
  });

  it("sets nullable place references to null when deleting a place", async () => {
    const place = await query<{ place_id: string }>(`
      select primary_place_id as place_id
      from catalog_records
      where primary_place_id is not null
      limit 1
    `);
    const placeId = place.rows[0]!.place_id;

    await query("delete from places where id = $1", [placeId]);

    const result = await query<{ count: string }>(
      "select count(*) from catalog_records where primary_place_id = $1",
      [placeId],
    );

    expect(Number(result.rows[0]!.count)).toBe(0);
  });
});

async function expectRejected(sql: string) {
  await expect(query(sql)).rejects.toBeTruthy();
}
