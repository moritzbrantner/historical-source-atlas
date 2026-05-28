import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://atlas:atlas_password@localhost:55434/historical_source_atlas';

const migrationFiles = [
  'db/atlas/migrations/001_initial_schema.sql',
  'db/atlas/migrations/002_referenced_entities.sql',
];
const seedFiles = ['db/atlas/seeds/001_current_static_sources.sql'];

async function applySqlFile(pool: Pool, path: string) {
  const sql = await readFile(resolve(path), 'utf8');
  await pool.query(sql);
}

async function main() {
  const command = process.argv[2];

  if (command !== 'migrate' && command !== 'seed') {
    throw new Error('Usage: bun ./scripts/apply-atlas-db.ts <migrate|seed>');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const files = command === 'migrate' ? migrationFiles : seedFiles;

  try {
    if (command === 'migrate') {
      const existingAtlas = await pool.query<{ exists: boolean }>(
        "select to_regclass('public.atlas_source_cards') is not null as exists",
      );

      if (existingAtlas.rows[0]?.exists) {
        console.log('Atlas schema already exists; skipping atlas migrations.');
        return;
      }
    }

    for (const file of files) {
      await applySqlFile(pool, file);
      console.log(`Applied ${file}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
