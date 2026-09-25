# Build Status

**Updated:** 2026-09-25
**Repository:** `https://github.com/service-jackys/Jackys-service-portal`
**Branch:** `main`
**Latest committed baseline:** `600d727 Document Windows local setup`

A follow-up local commit is being prepared for PostgreSQL verification, test fixes, and beginner-friendly startup documentation.

## Overall status

**Foundation and PostgreSQL persistence are implemented. Local PostgreSQL verification has passed with Docker Desktop and PostgreSQL 16.**

## Capability status

| Area                             | Status      | Notes                                                               |
| -------------------------------- | ----------- | ------------------------------------------------------------------- |
| Repository and GitHub remote     | Complete    | `main` pushed to `service-jackys/Jackys-service-portal`             |
| Express TypeScript API shell     | Complete    | API root, health, errors, security headers                          |
| Local development authentication | Complete    | In-memory only; not production-safe or persistent                   |
| OpenAPI and Swagger              | Complete    | Explicit local flag; disabled in production                         |
| PostgreSQL client                | Complete    | Uses `DATABASE_URL`                                                 |
| Migration runner                 | Complete    | Advisory lock, ordered files, SHA-256 checksums, rollback           |
| Initial PostgreSQL schema        | Implemented | Migration `001_initial_schema.sql`                                  |
| PostgreSQL integration tests     | Implemented | Requires reachable PostgreSQL; skips when unavailable               |
| Docker Compose configuration     | Present     | PostgreSQL 16 service on port 5432                                  |
| Local PostgreSQL execution       | Complete    | Docker PostgreSQL 16 healthy; migrations and integration tests pass |
| Supabase Auth                    | Not started | Reserved for staging/production                                     |
| Complaint API                    | Not started | Next capability after database verification                         |
| Appointment API                  | Not started | Schema exists; service/API workflow remains                         |
| Technician API                   | Not started | Schema exists; repositories/API remain                              |
| Production web UI                | Not started | Only minimal web shell exists                                       |
| Historical import/reconciliation | Not started | Must use authorized exports outside Git                             |
| Production deployment/cutover    | Not started | Apps Script remains production                                      |

## Verification matrix

| Check                          | Previous result                          | Current action                               |
| ------------------------------ | ---------------------------------------- | -------------------------------------------- |
| `npm run typecheck`            | Passed                                   | Re-run after restart if dependencies changed |
| `npm run build`                | Passed                                   | Re-run after restart if dependencies changed |
| `npm run format:check`         | Passed                                   | Re-run after restart if dependencies changed |
| API/OpenAPI tests              | Passed                                   | Re-run with `npm test`                       |
| Docker availability            | Passed: Docker 29.8.0 and Compose v5.5.1 | Recheck after a workstation restart          |
| PostgreSQL container           | Passed: healthy and running              | Run `docker compose ps`                      |
| Migration first run            | Passed: applied `001`                    | Run `npm run db:migrate`                     |
| Migration second run           | Passed: no-op                            | Expect `No migrations to apply.`             |
| PostgreSQL integration test    | Passed                                   | Run `npm test` with PostgreSQL running       |
| `npm audit --audit-level=high` | Not verified: network-dependent          | Re-run on an approved network                |

## Required evidence for Phase 1 completion

- Docker Desktop running.
- `docker compose ps` shows PostgreSQL healthy/running.
- `pg_isready` reports accepting connections.
- First migration run applies `001`.
- Second migration run is a no-op.
- `npm test` reports the PostgreSQL integration test passing, not skipped.
- Typecheck, format check, and build pass.

## Current blockers

1. `npm audit --audit-level=high` still requires npm registry/network access.
2. Phase 2 complaint capability is not started yet.

## Do not do during troubleshooting

- Do not delete the Docker volume.
- Do not modify the migration checksum manually except in the test's controlled checksum test.
- Do not use live customer data.
- Do not commit `.env` or credentials.
- Do not change the production Apps Script deployment.
