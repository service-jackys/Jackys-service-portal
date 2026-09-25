import type { PoolClient } from 'pg';
import type { CustomerType } from '../../contracts/src/index.js';

export type CustomerRecord = {
  id: string;
  customerNumber: string | null;
  customerType: CustomerType;
  name: string;
  contactNumber: string;
  email: string | null;
  address: string | null;
  region: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const columns = `
  customers.id,
  customers.customer_number AS "customerNumber",
  customers.customer_type AS "customerType",
  customers.name,
  customers.contact_number AS "contactNumber",
  customers.email,
  customers.address,
  customers.region,
  customers.created_at AS "createdAt",
  customers.updated_at AS "updatedAt"
`;

export async function insertCustomer(
  client: PoolClient,
  input: Record<string, unknown>,
): Promise<CustomerRecord> {
  const result = await client.query<CustomerRecord>(
    `INSERT INTO customers (customer_type, name, contact_number, email, address, region)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${columns}`,
    [
      input.customerType,
      input.name,
      input.contactNumber,
      input.email ?? null,
      input.address ?? null,
      input.region ?? null,
    ],
  );
  return result.rows[0];
}

export async function findCustomerById(
  client: PoolClient,
  id: string,
  forUpdate = false,
): Promise<CustomerRecord | null> {
  const result = await client.query<CustomerRecord>(
    `SELECT ${columns} FROM customers WHERE customers.id = $1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function updateCustomer(
  client: PoolClient,
  id: string,
  input: Record<string, unknown>,
): Promise<CustomerRecord | null> {
  const result = await client.query<CustomerRecord>(
    `UPDATE customers
     SET customer_type = $2, name = $3, contact_number = $4, email = $5, address = $6, region = $7, updated_at = now()
     WHERE id = $1
     RETURNING ${columns}`,
    [
      id,
      input.customerType,
      input.name,
      input.contactNumber,
      input.email ?? null,
      input.address ?? null,
      input.region ?? null,
    ],
  );
  return result.rows[0] ?? null;
}

export async function listCustomers(
  client: PoolClient,
  query: { search?: string; page: number; pageSize: number },
) {
  const values: unknown[] = [];
  const filters: string[] = [];
  if (query.search) {
    values.push(`%${query.search}%`);
    const parameter = `$${values.length}`;
    filters.push(
      `(name ILIKE ${parameter} OR customer_number ILIKE ${parameter} OR email ILIKE ${parameter} OR contact_number ILIKE ${parameter})`,
    );
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const count = await client.query<{ total: string }>(
    `SELECT count(*)::text AS total FROM customers ${where}`,
    values,
  );
  values.push(query.pageSize, (query.page - 1) * query.pageSize);
  const result = await client.query<CustomerRecord>(
    `SELECT ${columns} FROM customers ${where} ORDER BY name ASC, id ASC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return { items: result.rows, total: Number(count.rows[0].total) };
}
