import pg from 'pg';

const { Pool } = pg;

export function createDbPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error('DATABASE_URL must be configured before connecting to PostgreSQL.');
  }

  return new Pool({ connectionString });
}
