import type { PoolClient } from 'pg';

export type BranchRecord = {
  id: string;
  customerId: string | null;
  name: string;
  contactPerson: string | null;
  contactNumber: string | null;
  address: string | null;
  region: string | null;
  customerNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const columns = `
  branches.id,
  branches.customer_id AS "customerId",
  branches.name,
  branches.contact_person AS "contactPerson",
  branches.contact_number AS "contactNumber",
  branches.address,
  branches.region,
  branches.customer_number AS "customerNumber",
  branches.created_at AS "createdAt",
  branches.updated_at AS "updatedAt"
`;

export async function insertBranch(
  client: PoolClient,
  input: Record<string, unknown>,
): Promise<BranchRecord> {
  const result = await client.query<BranchRecord>(
    `INSERT INTO branches (customer_id, name, contact_person, contact_number, address, region, customer_number)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${columns}`,
    [
      input.customerId ?? null,
      input.name,
      input.contactPerson ?? null,
      input.contactNumber ?? null,
      input.address ?? null,
      input.region ?? null,
      input.customerNumber ?? null,
    ],
  );
  return result.rows[0];
}

export async function findBranchById(
  client: PoolClient,
  id: string,
  forUpdate = false,
): Promise<BranchRecord | null> {
  const result = await client.query<BranchRecord>(
    `SELECT ${columns} FROM branches WHERE branches.id = $1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function updateBranch(
  client: PoolClient,
  id: string,
  input: Record<string, unknown>,
): Promise<BranchRecord | null> {
  const result = await client.query<BranchRecord>(
    `UPDATE branches
     SET customer_id = $2, name = $3, contact_person = $4, contact_number = $5, address = $6, region = $7, customer_number = $8, updated_at = now()
     WHERE id = $1
     RETURNING ${columns}`,
    [
      id,
      input.customerId ?? null,
      input.name,
      input.contactPerson ?? null,
      input.contactNumber ?? null,
      input.address ?? null,
      input.region ?? null,
      input.customerNumber ?? null,
    ],
  );
  return result.rows[0] ?? null;
}

export async function listBranches(
  client: PoolClient,
  query: { customerId?: string; region?: string; search?: string; page: number; pageSize: number },
) {
  const values: unknown[] = [];
  const filters: string[] = [];
  const add = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (query.customerId) filters.push(`branches.customer_id = ${add(query.customerId)}`);
  if (query.region) filters.push(`branches.region = ${add(query.region)}`);
  if (query.search) {
    const parameter = add(`%${query.search}%`);
    filters.push(
      `(branches.name ILIKE ${parameter} OR branches.customer_number ILIKE ${parameter} OR branches.contact_person ILIKE ${parameter})`,
    );
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const count = await client.query<{ total: string }>(
    `SELECT count(*)::text AS total FROM branches ${where}`,
    values,
  );
  const limit = add(query.pageSize);
  const offset = add((query.page - 1) * query.pageSize);
  const result = await client.query<BranchRecord>(
    `SELECT ${columns} FROM branches ${where} ORDER BY branches.name ASC, branches.id ASC LIMIT ${limit} OFFSET ${offset}`,
    values,
  );
  return { items: result.rows, total: Number(count.rows[0].total) };
}
