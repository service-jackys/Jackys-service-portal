# Resume Notes

**Updated:** 2026-09-25
**Project folder:** `C:\Users\Vysakh Raju\Desktop\Jacky's\jackys service portal`
**Repository:** `https://github.com/service-jackys/Jackys-service-portal`
**Branch:** `main`
**Latest commits:**

- Phase2 complaint workflow changes are locally verified and uncommitted.
- `e5db878` — Verify Phase1 and document local startup
- `600d727` — Document Windows local setup
- `b8624f3` — Establish service portal foundation and database migrations

## Current implementation

Phase3 scheduling and technician operations are locally implemented and verified. The repository currently contains:

- Express 5 TypeScript API shell.
- Local-only authentication bootstrap with in-memory users and sessions.
- Fail-closed OpenAPI JSON and Swagger UI gating.
- PostgreSQL client using `DATABASE_URL`.
- Advisory-locked, checksummed migration runner.
- Initial PostgreSQL schema for profiles, RBAC, customers, branches, technicians, availability, complaints, complaint history, appointments, appointment history, legacy references, import batches, reference counters, and audit events.
- PostgreSQL-backed integration tests for migration idempotence, generated IDs, constraints, appointment uniqueness/rebooking, rollback, and checksum protection.
- Docker Compose PostgreSQL 16 configuration.
- CI workflow with a PostgreSQL service.
- Windows CMD setup instructions in `README.md`.
- Phase2 shared complaint contracts and provider-neutral auth boundary.
- PostgreSQL repositories for profiles/permissions, complaints, counters, history, and audit events.
- Public complaint submission with strict validation, local rate limiting, transactional `CMP-yymmdd-XXX` references, and audit/history writes.
- Protected complaint list/detail/notes/status endpoints with database-backed permissions and legal transitions.
- Protected customer, branch, and technician master-data APIs with audit events and availability management.
- Transactional appointment creation, assignment, cancellation/completion coupling, status history, and deterministic ICS downloads.
- Idempotent draft schedules with atomic, retry-safe promotion.

## Last verified state

Verified with PostgreSQL running in Docker:

- Docker 29.8.0 and Docker Compose v5.5.1 available.
- PostgreSQL 16 container healthy and accepting connections.
- `npm run db:migrate` reported `No migrations to apply.` on both verification runs; migration `002` is already applied.
- `npm test` passed all 9 tests, including the PostgreSQL scheduling integration test.
- `npm run typecheck` passed.
- `npm run build` passed.
- `npm run format:check` passed.

Still environment-dependent:

- `npm audit --audit-level=high` requires npm registry/network access.

## First resume sequence

Open Docker Desktop and wait until it is running. Then open CMD:

```cmd
cd /d "C:\Users\Vysakh Raju\Desktop\Jacky's\jackys service portal"
docker --version
docker compose version
docker compose up -d postgres
docker compose ps
docker compose exec postgres pg_isready -U jackys -d jackys_service_portal
npm run db:migrate
npm run db:migrate
npm test
npm run typecheck
npm run format:check
npm run build
```

Expected migration output:

```text
Applied migrations: 001
No migrations to apply.
```

If Docker fails, capture the complete output of these commands before changing files:

```cmd
docker info
docker compose config
docker compose ps -a
docker compose logs postgres
```

Do not delete the database volume or use `docker compose down -v` while diagnosing.

## Important boundaries

- Do not modify the live Apps Script deployment.
- Do not import live customer data in local development.
- Do not commit `.env`, customer exports, credentials, deployment URLs, Drive IDs, or Supabase service-role keys.
- The local auth provider must not be used in production.
- Keep Apps Script available as the rollback/read-only system until acceptance and reconciliation gates pass.

## Next coding capability

Phase3 scheduling and technician operations are complete and verified. The next capability is the Phase4 web journey:

1. Public complaint registration and confirmation.
2. Staff sign-in and role-gated navigation.
3. Complaint inbox/detail/update screens.
4. New-request and appointment scheduling screens.
5. Technician assignment and appointment list/calendar views.
6. Browser tests for golden-path and unauthorized access behavior.
