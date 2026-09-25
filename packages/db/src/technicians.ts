import type { PoolClient } from 'pg';

export type TechnicianRecord = {
  id: string;
  name: string;
  region: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AvailabilityRecord = {
  id: string;
  technicianId: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
  createdAt: Date;
};

const columns = `
  technicians.id,
  technicians.name,
  technicians.region,
  technicians.phone,
  technicians.email,
  technicians.active,
  technicians.created_at AS "createdAt",
  technicians.updated_at AS "updatedAt"
`;

export async function insertTechnician(
  client: PoolClient,
  input: Record<string, unknown>,
): Promise<TechnicianRecord> {
  const result = await client.query<TechnicianRecord>(
    `INSERT INTO technicians (name, region, phone, email, active)
     VALUES ($1, $2, $3, $4, COALESCE($5, true))
     RETURNING ${columns}`,
    [
      input.name,
      input.region ?? null,
      input.phone ?? null,
      input.email ?? null,
      input.active ?? null,
    ],
  );
  return result.rows[0];
}

export async function findTechnicianById(
  client: PoolClient,
  id: string,
  forUpdate = false,
): Promise<TechnicianRecord | null> {
  const result = await client.query<TechnicianRecord>(
    `SELECT ${columns} FROM technicians WHERE technicians.id = $1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function updateTechnician(
  client: PoolClient,
  id: string,
  input: Record<string, unknown>,
): Promise<TechnicianRecord | null> {
  const result = await client.query<TechnicianRecord>(
    `UPDATE technicians SET name = $2, region = $3, phone = $4, email = $5, active = $6, updated_at = now()
     WHERE id = $1 RETURNING ${columns}`,
    [
      id,
      input.name,
      input.region ?? null,
      input.phone ?? null,
      input.email ?? null,
      input.active ?? true,
    ],
  );
  return result.rows[0] ?? null;
}

export async function listTechnicians(
  client: PoolClient,
  query: {
    active?: 'true' | 'false';
    region?: string;
    search?: string;
    availableDate?: string;
    availableTime?: string;
    page: number;
    pageSize: number;
  },
) {
  const values: unknown[] = [];
  const filters: string[] = [];
  const add = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (query.active) filters.push(`technicians.active = ${add(query.active === 'true')}`);
  if (query.region) filters.push(`technicians.region = ${add(query.region)}`);
  if (query.search) {
    const parameter = add(`%${query.search}%`);
    filters.push(
      `(technicians.name ILIKE ${parameter} OR technicians.email ILIKE ${parameter} OR technicians.phone ILIKE ${parameter})`,
    );
  }
  if (query.availableDate && query.availableTime) {
    filters.push(
      `EXISTS (SELECT 1 FROM technician_availability available WHERE available.technician_id = technicians.id AND available.weekday = EXTRACT(DOW FROM ${add(query.availableDate)}::date) AND ${add(query.availableTime)}::time >= available.starts_at AND ${add(query.availableTime)}::time < available.ends_at)`,
    );
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const count = await client.query<{ total: string }>(
    `SELECT count(*)::text AS total FROM technicians ${where}`,
    values,
  );
  const limit = add(query.pageSize);
  const offset = add((query.page - 1) * query.pageSize);
  const result = await client.query<TechnicianRecord>(
    `SELECT ${columns} FROM technicians ${where} ORDER BY technicians.name ASC, technicians.id ASC LIMIT ${limit} OFFSET ${offset}`,
    values,
  );
  return { items: result.rows, total: Number(count.rows[0].total) };
}

export async function replaceTechnicianAvailability(
  client: PoolClient,
  technicianId: string,
  windows: Array<Record<string, unknown>>,
): Promise<AvailabilityRecord[]> {
  await client.query('DELETE FROM technician_availability WHERE technician_id = $1', [
    technicianId,
  ]);
  for (const window of windows) {
    await client.query(
      `INSERT INTO technician_availability (technician_id, weekday, starts_at, ends_at) VALUES ($1, $2, $3, $4)`,
      [technicianId, window.weekday, window.startsAt, window.endsAt],
    );
  }
  return listTechnicianAvailability(client, technicianId);
}

export async function listTechnicianAvailability(
  client: PoolClient,
  technicianId: string,
): Promise<AvailabilityRecord[]> {
  const result = await client.query<AvailabilityRecord>(
    `SELECT id, technician_id AS "technicianId", weekday, starts_at::text AS "startsAt", ends_at::text AS "endsAt", created_at AS "createdAt" FROM technician_availability WHERE technician_id = $1 ORDER BY weekday`,
    [technicianId],
  );
  return result.rows;
}

export async function hasTechnicianAvailability(
  client: PoolClient,
  technicianId: string,
  date: string,
  time: string,
): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM technician_availability WHERE technician_id = $1 AND weekday = EXTRACT(DOW FROM $2::date) AND $3::time >= starts_at AND $3::time < ends_at`,
    [technicianId, date, time],
  );
  return result.rowCount === 1;
}
