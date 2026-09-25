import type { Pool, PoolClient } from 'pg';
import { withTransaction } from './transaction.js';

export type ProfileAccess = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  active: boolean;
};

export async function findProfileAccessByEmail(
  client: PoolClient,
  email: string,
): Promise<ProfileAccess | null> {
  const result = await client.query<ProfileAccess>(
    `SELECT
       profiles.id,
       profiles.email,
       profiles.display_name AS "displayName",
       profiles.active,
       COALESCE(array_agg(DISTINCT roles.code) FILTER (WHERE roles.code IS NOT NULL), '{}') AS roles,
       COALESCE(array_agg(DISTINCT permissions.code) FILTER (WHERE permissions.code IS NOT NULL), '{}') AS permissions
     FROM profiles
     LEFT JOIN profile_roles ON profile_roles.profile_id = profiles.id
     LEFT JOIN roles ON roles.id = profile_roles.role_id
     LEFT JOIN role_permissions ON role_permissions.role_id = roles.id
     LEFT JOIN permissions ON permissions.id = role_permissions.permission_id
     WHERE lower(profiles.email) = lower($1)
     GROUP BY profiles.id
     LIMIT 1`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function ensureLocalAdminProfile(
  pool: Pool,
  email: string,
  displayName: string,
): Promise<void> {
  await withTransaction(pool, async (client) => {
    const profile = await client.query<{ id: string }>(
      `INSERT INTO profiles (identity_provider, identity_subject, email, display_name)
       VALUES ('local', $1, lower($2), $3)
       ON CONFLICT (lower(email)) DO UPDATE
         SET identity_provider = 'local', identity_subject = EXCLUDED.identity_subject,
             display_name = EXCLUDED.display_name, active = true, updated_at = now()
       RETURNING id`,
      [email, email, displayName],
    );
    await client.query(
      `INSERT INTO profile_roles (profile_id, role_id)
       SELECT $1, roles.id FROM roles WHERE roles.code = 'admin'
       ON CONFLICT DO NOTHING`,
      [profile.rows[0].id],
    );
  });
}
