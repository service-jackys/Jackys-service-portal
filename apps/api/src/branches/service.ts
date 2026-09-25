import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  branchListQuerySchema,
  branchWriteSchema,
} from '../../../../packages/contracts/src/index.js';
import {
  findBranchById,
  insertBranch,
  listBranches,
  updateBranch,
} from '../../../../packages/db/src/branches.js';
import { insertAuditEvent } from '../../../../packages/db/src/audit.js';
import { withTransaction } from '../../../../packages/db/src/transaction.js';

export class BranchServiceError extends Error {
  constructor(
    public readonly code: 'not-found',
    message: string,
  ) {
    super(message);
  }
}

export function createBranchService(pool: Pool) {
  async function create(input: unknown, profileId: string, requestId: string = randomUUID()) {
    const data = branchWriteSchema.parse(input);
    return withTransaction(pool, async (client) => {
      const branch = await insertBranch(client, data);
      await insertAuditEvent(client, {
        actorProfileId: profileId,
        action: 'branch.created',
        targetType: 'branch',
        targetId: branch.id,
        metadata: { customerId: branch.customerId },
        requestId,
      });
      return branch;
    });
  }

  async function list(input: unknown) {
    const query = branchListQuerySchema.parse(input);
    const client = await pool.connect();
    try {
      return await listBranches(client, query);
    } finally {
      client.release();
    }
  }

  async function detail(id: string) {
    const client = await pool.connect();
    try {
      const branch = await findBranchById(client, id);
      if (!branch) throw new BranchServiceError('not-found', 'The branch was not found.');
      return branch;
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
    const data = branchWriteSchema.parse(input);
    return withTransaction(pool, async (client) => {
      const branch = await updateBranch(client, inputId, data);
      if (!branch) throw new BranchServiceError('not-found', 'The branch was not found.');
      await insertAuditEvent(client, {
        actorProfileId: profileId,
        action: 'branch.updated',
        targetType: 'branch',
        targetId: inputId,
        metadata: {},
        requestId,
      });
      return branch;
    });
  }

  return { create, list, detail, update };
}

export type BranchService = ReturnType<typeof createBranchService>;
