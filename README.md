# Jacky's Service Portal

This private repository is the migration workspace for replacing the current Google Apps Script service application with a normal web application.

## Current status

Phase 0 foundation is in progress. The live Apps Script application remains the production system and has not been changed.

The target architecture is:

- TypeScript Node.js and Express API.
- PostgreSQL, initially compatible with Supabase-hosted PostgreSQL.
- Supabase Auth for identity and application-managed RBAC.
- HTML/CSS/JavaScript with Tailwind CSS and Alpine.js for the web interface.
- Supabase Storage for private attachments and workbook files.
- Render deployment connected to a private GitHub repository.

## Local setup

### Windows CMD quick start

The current project folder is:

```text
C:\Users\Vysakh Raju\Desktop\Jacky's\jackys service portal
```

Use **Docker Desktop** for the local PostgreSQL service, then open **CMD** and run:

```cmd
cd /d "C:\Users\Vysakh Raju\Desktop\Jacky's\jackys service portal"
copy .env.example .env
notepad .env
npm install
docker compose up -d postgres
docker compose ps
npm run db:migrate
npm run dev
```

In `.env`, keep `AUTH_PROVIDER=local` for local development and replace `LOCAL_BOOTSTRAP_TOKEN` with a random local-only value. Set `OPENAPI_DOCS_ENABLED=true` if you want to use the local Swagger documentation.

Open these URLs after the API starts:

- API root: `http://localhost:3000/api`
- Health check: `http://localhost:3000/health`
- Swagger UI, when enabled: `http://localhost:3000/api/docs`
- OpenAPI JSON, when enabled: `http://localhost:3000/api/openapi.json`

To stop PostgreSQL without deleting the local database:

```cmd
docker compose down
```

Do not use `docker compose down -v` unless you intentionally want to delete the local database volume.

Migrations create an empty local schema and seed only roles and permission definitions. They do not import live Google Sheets or customer data.

The OpenAPI contract and Swagger UI are disabled by default and are always unavailable when `NODE_ENV=production`. Do not expose the local documentation or bootstrap endpoint publicly.

### Local authentication bootstrap

The local API defaults to `AUTH_PROVIDER=local` only outside production. Set a random, local-only `LOCAL_BOOTSTRAP_TOKEN` in `.env`, start the API, and use `POST /api/auth/bootstrap` once to create an in-memory admin session:

```json
{
  "bootstrapToken": "the-value-from-.env",
  "email": "developer@example.test",
  "name": "Local Developer",
  "password": "use-a-local-password-at-least-12-characters"
}
```

The response contains a bearer token for local API checks. Bootstrap is one-time per process, users and sessions are lost on restart, and the token must not be committed or reused outside local development. `AUTH_PROVIDER=local` is rejected by the app in production; the production path is reserved for Supabase Auth and must be wired before deployment.

Do not place credentials, customer exports, Google Apps Script deployment details, or `config.json` in this repository.

## Migration principles

- Keep Apps Script running until the replacement passes workflow and data-reconciliation acceptance gates.
- Migrate by capability, beginning with authentication, complaints, and scheduling.
- Use PostgreSQL transactions and constraints instead of in-memory locks.
- Keep protected files in private storage and enforce authorization on the server.
- Preserve legacy complaint and appointment references during migration.

See `docs/migration/source-inventory.md` and `docs/architecture/target-architecture.md` for the Phase 0 baseline.
