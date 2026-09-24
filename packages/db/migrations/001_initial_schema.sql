CREATE TABLE profiles (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identity_provider text,
  identity_subject text,
  email text NOT NULL,
  display_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_identity_pair_check CHECK (
    (identity_provider IS NULL AND identity_subject IS NULL)
    OR (identity_provider IS NOT NULL AND identity_subject IS NOT NULL)
  ),
  CONSTRAINT profiles_email_check CHECK (length(trim(email)) BETWEEN 3 AND 320),
  CONSTRAINT profiles_display_name_check CHECK (length(trim(display_name)) BETWEEN 1 AND 120)
);

CREATE UNIQUE INDEX profiles_email_unique ON profiles (lower(email));
CREATE UNIQUE INDEX profiles_identity_unique
  ON profiles (identity_provider, identity_subject)
  WHERE identity_provider IS NOT NULL AND identity_subject IS NOT NULL;

CREATE TABLE roles (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_code_check CHECK (code IN ('user', 'sales', 'management', 'admin'))
);

CREATE TABLE permissions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profile_roles (
  profile_id bigint NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  role_id bigint NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by bigint REFERENCES profiles (id) ON DELETE SET NULL,
  PRIMARY KEY (profile_id, role_id)
);

CREATE TABLE role_permissions (
  role_id bigint NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  permission_id bigint NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by bigint REFERENCES profiles (id) ON DELETE SET NULL,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE customers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_number text,
  customer_type text NOT NULL,
  name text NOT NULL,
  contact_number text NOT NULL,
  email text,
  address text,
  region text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_type_check CHECK (customer_type IN ('individual', 'company', 'b2b')),
  CONSTRAINT customers_name_check CHECK (length(trim(name)) BETWEEN 1 AND 200),
  CONSTRAINT customers_contact_check CHECK (length(trim(contact_number)) BETWEEN 1 AND 50),
  CONSTRAINT customers_email_check CHECK (email IS NULL OR length(trim(email)) BETWEEN 3 AND 320)
);

CREATE UNIQUE INDEX customers_number_unique
  ON customers (customer_number)
  WHERE customer_number IS NOT NULL;

CREATE TABLE branches (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id bigint REFERENCES customers (id) ON DELETE SET NULL,
  name text NOT NULL,
  contact_person text,
  contact_number text,
  address text,
  region text,
  customer_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT branches_name_check CHECK (length(trim(name)) BETWEEN 1 AND 200),
  CONSTRAINT branches_contact_number_check CHECK (
    contact_number IS NULL OR length(trim(contact_number)) BETWEEN 1 AND 50
  )
);

CREATE TABLE technicians (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  region text,
  phone text,
  email text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT technicians_name_check CHECK (length(trim(name)) BETWEEN 1 AND 120),
  CONSTRAINT technicians_email_check CHECK (email IS NULL OR length(trim(email)) BETWEEN 3 AND 320)
);

CREATE UNIQUE INDEX technicians_email_unique
  ON technicians (lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE technician_availability (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  technician_id bigint NOT NULL REFERENCES technicians (id) ON DELETE CASCADE,
  weekday smallint NOT NULL,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT technician_availability_weekday_check CHECK (weekday BETWEEN 0 AND 6),
  CONSTRAINT technician_availability_range_check CHECK (starts_at < ends_at),
  CONSTRAINT technician_availability_unique UNIQUE (technician_id, weekday)
);

CREATE TABLE import_batches (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'started',
  initiated_by bigint REFERENCES profiles (id) ON DELETE SET NULL,
  CONSTRAINT import_batches_status_check CHECK (status IN ('started', 'completed', 'failed')),
  CONSTRAINT import_batches_dates_check CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE legacy_references (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_name text NOT NULL,
  entity_type text NOT NULL,
  legacy_reference text NOT NULL,
  entity_id bigint NOT NULL,
  import_batch_id bigint REFERENCES import_batches (id) ON DELETE SET NULL,
  source_row integer,
  reconciliation_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legacy_references_status_check CHECK (
    reconciliation_status IN ('pending', 'matched', 'review', 'rejected')
  ),
  CONSTRAINT legacy_references_source_row_check CHECK (source_row IS NULL OR source_row > 0),
  CONSTRAINT legacy_references_unique UNIQUE (source_name, entity_type, legacy_reference)
);

CREATE TABLE complaints (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  complaint_reference text NOT NULL UNIQUE,
  customer_id bigint REFERENCES customers (id) ON DELETE SET NULL,
  branch_id bigint REFERENCES branches (id) ON DELETE SET NULL,
  customer_type text NOT NULL,
  customer_name text NOT NULL,
  contact_number text NOT NULL,
  customer_email text,
  address text,
  region text,
  brand text,
  model text,
  serial_or_item_code text,
  description text NOT NULL,
  sales_order_number text,
  warranty_classification text,
  status text NOT NULL DEFAULT 'New',
  cce_notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by bigint REFERENCES profiles (id) ON DELETE SET NULL,
  CONSTRAINT complaints_reference_check CHECK (complaint_reference ~ '^CMP-[0-9]{6}-[0-9]{3}$'),
  CONSTRAINT complaints_type_check CHECK (customer_type IN ('individual', 'company', 'b2b')),
  CONSTRAINT complaints_status_check CHECK (
    status IN ('New', 'Under Review', 'Pending Information', 'Ready for Scheduling', 'Scheduled', 'Closed', 'Cancelled')
  ),
  CONSTRAINT complaints_name_check CHECK (length(trim(customer_name)) BETWEEN 1 AND 200),
  CONSTRAINT complaints_contact_check CHECK (length(trim(contact_number)) BETWEEN 1 AND 50),
  CONSTRAINT complaints_description_check CHECK (length(trim(description)) BETWEEN 1 AND 10000),
  CONSTRAINT complaints_email_check CHECK (
    customer_email IS NULL OR length(trim(customer_email)) BETWEEN 3 AND 320
  )
);

CREATE INDEX complaints_status_submitted_idx ON complaints (status, submitted_at DESC);
CREATE INDEX complaints_region_idx ON complaints (region);

CREATE TABLE complaint_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  complaint_id bigint NOT NULL REFERENCES complaints (id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by bigint REFERENCES profiles (id) ON DELETE SET NULL,
  reason text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT complaint_history_from_status_check CHECK (
    from_status IS NULL OR from_status IN ('New', 'Under Review', 'Pending Information', 'Ready for Scheduling', 'Scheduled', 'Closed', 'Cancelled')
  ),
  CONSTRAINT complaint_history_to_status_check CHECK (
    to_status IN ('New', 'Under Review', 'Pending Information', 'Ready for Scheduling', 'Scheduled', 'Closed', 'Cancelled')
  )
);

CREATE INDEX complaint_status_history_complaint_idx
  ON complaint_status_history (complaint_id, changed_at DESC);

CREATE TABLE appointments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_reference text NOT NULL UNIQUE,
  complaint_id bigint REFERENCES complaints (id) ON DELETE SET NULL,
  customer_id bigint REFERENCES customers (id) ON DELETE SET NULL,
  branch_id bigint REFERENCES branches (id) ON DELETE SET NULL,
  technician_id bigint REFERENCES technicians (id) ON DELETE SET NULL,
  customer_type text NOT NULL,
  customer_name text NOT NULL,
  contact_number text NOT NULL,
  customer_email text,
  address text,
  region text,
  brand text,
  model text,
  item_code text,
  fault_description text NOT NULL,
  job_warranty text,
  sales_order_number text,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  status text NOT NULL DEFAULT 'Scheduled',
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by bigint REFERENCES profiles (id) ON DELETE SET NULL,
  updated_by bigint REFERENCES profiles (id) ON DELETE SET NULL,
  CONSTRAINT appointments_reference_check CHECK (appointment_reference ~ '^APT-[0-9]{4}-[0-9]{5}$'),
  CONSTRAINT appointments_type_check CHECK (customer_type IN ('individual', 'company', 'b2b')),
  CONSTRAINT appointments_status_check CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')),
  CONSTRAINT appointments_name_check CHECK (length(trim(customer_name)) BETWEEN 1 AND 200),
  CONSTRAINT appointments_contact_check CHECK (length(trim(contact_number)) BETWEEN 1 AND 50),
  CONSTRAINT appointments_fault_check CHECK (length(trim(fault_description)) BETWEEN 1 AND 10000),
  CONSTRAINT appointments_email_check CHECK (
    customer_email IS NULL OR length(trim(customer_email)) BETWEEN 3 AND 320
  ),
  CONSTRAINT appointments_closed_at_check CHECK (
    (status IN ('Completed', 'Cancelled') AND closed_at IS NOT NULL)
    OR (status IN ('Scheduled', 'In Progress') AND closed_at IS NULL)
  )
);

CREATE UNIQUE INDEX appointments_active_complaint_unique
  ON appointments (complaint_id)
  WHERE complaint_id IS NOT NULL AND status <> 'Cancelled';
CREATE INDEX appointments_schedule_idx ON appointments (appointment_date, appointment_time);
CREATE INDEX appointments_technician_schedule_idx
  ON appointments (technician_id, appointment_date, appointment_time)
  WHERE technician_id IS NOT NULL AND status <> 'Cancelled';

CREATE TABLE appointment_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_id bigint NOT NULL REFERENCES appointments (id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by bigint REFERENCES profiles (id) ON DELETE SET NULL,
  reason text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_history_from_status_check CHECK (
    from_status IS NULL OR from_status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')
  ),
  CONSTRAINT appointment_history_to_status_check CHECK (
    to_status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled')
  )
);

CREATE INDEX appointment_status_history_appointment_idx
  ON appointment_status_history (appointment_id, changed_at DESC);

CREATE TABLE reference_counters (
  namespace text NOT NULL,
  scope_date date NOT NULL,
  next_value bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (namespace, scope_date),
  CONSTRAINT reference_counters_namespace_check CHECK (namespace IN ('complaint', 'appointment')),
  CONSTRAINT reference_counters_value_check CHECK (next_value > 0)
);

CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_profile_id bigint REFERENCES profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id bigint,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_events_action_check CHECK (length(trim(action)) BETWEEN 1 AND 120),
  CONSTRAINT audit_events_metadata_check CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX audit_events_occurred_idx ON audit_events (occurred_at DESC);
CREATE INDEX audit_events_target_idx ON audit_events (target_type, target_id);

INSERT INTO roles (code, display_name)
VALUES
  ('user', 'User'),
  ('sales', 'Sales'),
  ('management', 'Management'),
  ('admin', 'Administrator')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (code, description)
VALUES
  ('dashboard.read', 'View dashboard data'),
  ('complaints.read', 'View complaint inbox and details'),
  ('complaints.write', 'Create and update complaints'),
  ('scheduler.read', 'View scheduling data'),
  ('scheduler.write', 'Create and update schedules'),
  ('appointments.read', 'View appointments'),
  ('appointments.write', 'Create, assign, and update appointments'),
  ('technicians.read', 'View technicians'),
  ('technicians.write', 'Create and manage technicians'),
  ('quotation.read', 'View quotations'),
  ('quotation.write', 'Create and update quotations'),
  ('inspection.read', 'View inspections'),
  ('inspection.write', 'Create and update inspections'),
  ('service_job_card.read', 'View service job cards'),
  ('service_job_card.write', 'Create and update service job cards'),
  ('reports.read', 'View reports'),
  ('admin.users', 'Manage application users'),
  ('admin.permissions', 'Manage roles and permissions'),
  ('audit.read', 'View audit events')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
CROSS JOIN permissions
WHERE roles.code = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.code IN (
  'dashboard.read',
  'complaints.read',
  'complaints.write',
  'scheduler.read',
  'scheduler.write',
  'appointments.read',
  'appointments.write',
  'technicians.read',
  'technicians.write'
)
WHERE roles.code IN ('management', 'sales')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles
JOIN permissions ON permissions.code IN ('dashboard.read')
WHERE roles.code = 'user'
ON CONFLICT DO NOTHING;
