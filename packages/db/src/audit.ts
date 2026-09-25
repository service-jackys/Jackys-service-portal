import type { PoolClient } from 'pg';

export type AuditEventInput = {
  actorProfileId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
};

export async function insertAuditEvent(client: PoolClient, event: AuditEventInput): Promise<void> {
  await client.query(
    `INSERT INTO audit_events (
       actor_profile_id, action, target_type, target_id, metadata, request_id
     ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [
      event.actorProfileId ?? null,
      event.action,
      event.targetType ?? null,
      event.targetId ?? null,
      JSON.stringify(event.metadata ?? {}),
      event.requestId ?? null,
    ],
  );
}
