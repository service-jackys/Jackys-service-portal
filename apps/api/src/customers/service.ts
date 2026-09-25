import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  customerListQuerySchema,
  customerWriteSchema,
} from '../../../../packages/contracts/src/index.js';
import {
  findCustomerById,
  insertCustomer,
  listCustomers,
  updateCustomer,
} from '../../../../packages/db/src/customers.js';
import { insertAuditEvent } from '../../../../packages/db/src/audit.js';
import { withTransaction } from '../../../../packages/db/src/transaction.js';

export class CustomerServiceError extends Error {
  constructor(
    public readonly code: 'not-found',
    message: string,
  ) {
    super(message);
  }
}

export function createCustomerService(pool: Pool) {
  async function create(input: unknown, profileId: string, requestId: string = randomUUID()) {
    const data = customerWriteSchema.parse(input);
    return withTransaction(pool, async (client) => {
      const customer = await insertCustomer(client, data);
      await insertAuditEvent(client, {
        actorProfileId: profileId,
        action: 'customer.created',
        targetType: 'customer',
        targetId: customer.id,
        metadata: { customerType: customer.customerType },
        requestId,
      });
      return customer;
    });
  }

  async function list(input: unknown) {
    const query = customerListQuerySchema.parse(input);
    const client = await pool.connect();
    try {
      return await listCustomers(client, query);
    } finally {
      client.release();
    }
  }

  async function detail(id: string) {
    const client = await pool.connect();
    try {
      const customer = await findCustomerById(client, id);
      if (!customer) throw new CustomerServiceError('not-found', 'The customer was not found.');
      return customer;
    } finally {
      client.release();
    }
  }

  async function update(
    inputId: string,
    input: unknown,
    profileId: string,
    requestId: string = randomUUID(),
  ) {
    const data = customerWriteSchema.parse(input);
    return withTransaction(pool, async (client) => {
      const customer = await updateCustomer(client, inputId, data);
      if (!customer) throw new CustomerServiceError('not-found', 'The customer was not found.');
      await insertAuditEvent(client, {
        actorProfileId: profileId,
        action: 'customer.updated',
        targetType: 'customer',
        targetId: inputId,
        metadata: {},
        requestId,
      });
      return customer;
    });
  }

  return { create, list, detail, update };
}

export type CustomerService = ReturnType<typeof createCustomerService>;
