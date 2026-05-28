import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool, type QueryResult, type QueryResultRow } from "pg";

const defaultDatabaseUrl =
  "postgresql://atlas:atlas_password@localhost:55434/historical_source_atlas";
const databaseUrl = process.env.DATABASE_URL ?? defaultDatabaseUrl;

assertSafeTestDatabaseUrl(databaseUrl);

const pool = new Pool({
  connectionString: databaseUrl,
});

export async function resetDatabase() {
  await query("drop extension if exists postgis cascade");
  await query("drop extension if exists pgcrypto cascade");
  await query("drop schema if exists public cascade");
  await query("create schema public");
  await query("grant all on schema public to atlas");
  await query("grant all on schema public to public");
  await query("create extension if not exists pgcrypto");
  await query("create extension if not exists postgis");
}

export async function applySqlFile(path: string) {
  const sql = await readFile(resolve(path), "utf8");

  await query(sql);
}

export function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(sql, params);
}

export async function closeDb() {
  await pool.end();
}

function assertSafeTestDatabaseUrl(url: string) {
  const parsedUrl = new URL(url);
  const host = parsedUrl.hostname;
  const database = parsedUrl.pathname.replace(/^\//, "");
  const safeHosts = new Set(["127.0.0.1", "localhost"]);

  if (!safeHosts.has(host) || database !== "historical_source_atlas") {
    throw new Error(
      `Refusing to reset unsafe database URL. Expected local historical_source_atlas, received ${url}.`,
    );
  }
}
