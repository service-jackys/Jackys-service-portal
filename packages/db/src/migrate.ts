import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PoolClient } from 'pg';
import { createDbPool } from './client.js';

const migrationDirectory = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const migrationPattern = /^(\d+)_([a-z0-9_]+)\.sql$/;
const advisoryLockKey = 48372619;

type Migration = {
  version: string;
  name: string;
  path: string;
  checksum: string;
  sql: string;
};

async function loadMigrations(): Promise<Migration[]> {
  const entries = await readdir(migrationDirectory, { withFileTypes: true });
  const migrations: Migration[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name) !== '.sql') continue;
    const match = migrationPattern.exec(entry.name);
    if (!match) throw new Error(`Invalid migration filename: ${entry.name}`);

    const path = join(migrationDirectory, entry.name);
    const sql = await readFile(path, 'utf8');
    migrations.push({
      version: match[1],
      name: match[2],
      path,
      checksum: createHash('sha256').update(sql).digest('hex'),
      sql,
    });
  }

  migrations.sort((left, right) =>
    left.version.localeCompare(right.version, 'en', { numeric: true }),
  );
  for (let index = 1; index < migrations.length; index += 1) {
    if (migrations[index - 1].version === migrations[index].version) {
      throw new Error(`Duplicate migration version: ${migrations[index].version}`);
    }
  }
  return migrations;
}

async function ensureMigrationTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      name text NOT NULL,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function migrate(): Promise<string[]> {
  const pool = createDbPool();
  const applied: string[] = [];
  const migrations = await loadMigrations();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [advisoryLockKey]);
    await ensureMigrationTable(client);

    const existing = await client.query<{ version: string; checksum: string }>(
      'SELECT version, checksum FROM schema_migrations ORDER BY version',
    );
    const checksums = new Map(existing.rows.map((row) => [row.version, row.checksum]));

    for (const migration of migrations) {
      const existingChecksum = checksums.get(migration.version);
      if (existingChecksum && existingChecksum !== migration.checksum) {
        throw new Error(`Applied migration ${basename(migration.path)} has changed.`);
      }
      if (existingChecksum) continue;

      await client.query(migration.sql);
      await client.query(
        'INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
        [migration.version, migration.name, migration.checksum],
      );
      applied.push(migration.version);
    }

    await client.query('COMMIT');
    return applied;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  migrate()
    .then((applied) => {
      console.log(
        applied.length ? `Applied migrations: ${applied.join(', ')}` : 'No migrations to apply.',
      );
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
