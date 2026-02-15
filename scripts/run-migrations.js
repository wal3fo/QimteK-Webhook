/**
 * Run Supabase migrations
 *
 * Requires DATABASE_URL in .env (Supabase Dashboard > Project Settings > Database > Connection string URI)
 * Or SUPABASE_DB_URL
 */

import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');

const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error(
    'Missing DATABASE_URL or SUPABASE_DB_URL in .env\n' +
    'Get it from: Supabase Dashboard > Project Settings > Database > Connection string (URI)'
  );
  process.exit(1);
}

async function run() {
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (!files.length) {
    console.log('No migration files found.');
    return;
  }

  const client = new pg.Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log('Connected to Supabase.\n');

    for (const file of files) {
      const path = join(migrationsDir, file);
      const sql = await readFile(path, 'utf8');
      console.log(`Running ${file}...`);
      try {
        await client.query(sql);
        console.log(`  ✓ ${file}\n`);
      } catch (err) {
        console.error(`  ✗ ${file} failed:`, err.message);
        throw err;
      }
    }

    console.log('All migrations completed successfully.');
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
