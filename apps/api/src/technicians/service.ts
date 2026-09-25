import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  technicianAvailabilitySchema,
  technicianListQuerySchema,
  technicianWriteSchema,
} from '../../../../packages/contracts/src/index.js';
import {
  findTechnicianById,
  insertTechnician,
  listTechnicianAvailability,
  listTechnicians,
  replaceTechnicianAvailability,
  updateTechnician,
} from '../../../../packages/db/src/technicians.js';
import { insertAuditEvent } from '../../../../packages/db/src/audit.js';
import { withTransaction } from '../../../../packages/db/src/transaction.js';

export class TechnicianServiceError extends Error {
  constructor(
    public readonly code: 'not-found',
    message: string,
  ) {
    super(message);
  }
}

export function createTechnicianService(pool: Pool) {
  async function create(input: unknown, profileId: string, requestId: string = randomUUID()) {
    const data = technicianWriteSchema.parse(input);
    return withTransaction(pool, async (client) => {
      const technician = await insertTechnician(client, data);
      await insertAuditEvent(client, {
        actorProfileId: profileId,
        action: 'technician.created',
        targetType: 'technician',
        targetId: technician.id,
        metadata: { active: technician.active },
        requestId,
      });
      return technician;
    });
  }

  async function list(input: unknown) {
    const query = technicianListQuerySchema.parse(input);
    const client = await pool.connect();
    try {
      return await listTechnicians(client, query);
    } finally {
      client.release();
    }
  }

  async function detail(id: string) {
    const client = await pool.connect();
    try {
      const technician = await findTechnicianById(client, id);
      if (!technician)
        throw new TechnicianServiceError('not-found', 'The technician was not found.');
      const availability = await listTechnicianAvailability(client, id);
      return { technician, availability };
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
    const data = technicianWriteSchema.parse(input);
    return withTransaction(pool, async (client) => {
      const technician = await updateTechnician(client, inputId, data);
      if (!technician)
        throw new TechnicianServiceError('not-found', 'The technician was not found.');
      await insertAuditEvent(client, {
        actorProfileId: profileId,
        action: 'technician.updated',
        targetType: 'technician',
        targetId: inputId,
        metadata: {},
        requestId,
      });
      return technician;
    });
  }

  async function replaceAvailability(
    inputId: string,
    input: unknown,
    profileId: string,
    requestId: string = randomUUID(),
  ) {
    const data = technicianAvailabilitySchema.parse(input);
    return withTransaction(pool, async (client) => {
      const technician = await findTechnicianById(client, inputId, true);
      if (!technician)
        throw new TechnicianServiceError('not-found', 'The technician was not found.');
      const availability = await replaceTechnicianAvailability(client, inputId, data.windows);
      await insertAuditEvent(client, {
        actorProfileId: profileId,
        action: 'technician.availability_replaced',
        targetType: 'technician',
        targetId: inputId,
        metadata: { windowCount: availability.length },
        requestId,
      });
      return availability;
    });
  }

  return { create, list, detail, update, replaceAvailability };
}

export type TechnicianService = ReturnType<typeof createTechnicianService>;
