INSERT INTO permissions (code, description)
VALUES
  ('customers.read', 'View customers'),
  ('customers.write', 'Create and update customers'),
  ('branches.read', 'View customer branches'),
  ('branches.write', 'Create and update customer branches')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.code IN (
  'customers.read',
  'customers.write',
  'branches.read',
  'branches.write'
)
WHERE roles.code IN ('management', 'sales', 'admin')
ON CONFLICT DO NOTHING;

CREATE TABLE draft_schedules (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'Draft',
  created_by bigint REFERENCES profiles (id) ON DELETE SET NULL,
  promoted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT draft_schedules_status_check CHECK (status IN ('Draft', 'Promoted', 'Cancelled')),
  CONSTRAINT draft_schedules_promotion_check CHECK (
    (status = 'Promoted' AND promoted_at IS NOT NULL)
    OR (status IN ('Draft', 'Cancelled') AND promoted_at IS NULL)
  ),
  CONSTRAINT draft_schedules_idempotency_key_check CHECK (length(trim(idempotency_key)) BETWEEN 1 AND 200)
);

CREATE TABLE draft_schedule_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  draft_schedule_id bigint NOT NULL REFERENCES draft_schedules (id) ON DELETE CASCADE,
  complaint_id bigint NOT NULL REFERENCES complaints (id) ON DELETE CASCADE,
  technician_id bigint REFERENCES technicians (id) ON DELETE SET NULL,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  appointment_id bigint UNIQUE REFERENCES appointments (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT draft_schedule_item_unique UNIQUE (draft_schedule_id, complaint_id)
);

CREATE INDEX draft_schedules_status_created_idx
  ON draft_schedules (status, created_at DESC);
CREATE INDEX draft_schedule_items_schedule_idx
  ON draft_schedule_items (draft_schedule_id, id);
CREATE INDEX draft_schedule_items_slot_idx
  ON draft_schedule_items (appointment_date, appointment_time, technician_id);
