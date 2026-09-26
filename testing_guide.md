# Jacky's Service Portal Testing Guide

This guide is for testing the local migration project. It is written for the first browser-based slice of Phase 4 and assumes the previous system was built with Google Apps Script.

## 1. Understand the two systems

There are currently two separate systems:

- **Google Apps Script:** the existing production system. Customers and staff should continue using this system until a formal migration and cutover decision is approved.
- **Local migration project:** the new TypeScript, Express, PostgreSQL, and browser application used for development and testing. It is not production.

The local project uses its own local database. Do not use production credentials, live customer data, private deployment URLs, or exported customer files while testing.

## 2. Prerequisites

Install or have access to:

- Node.js and npm.
- Docker Desktop with Docker Compose enabled.
- Git, if you are updating the repository.
- A modern browser such as Chrome or Microsoft Edge.

The project dependencies are already described in `package.json`.

## 3. Open the correct project folder

Open Command Prompt or PowerShell and move to the migration project. In Command Prompt, use:

```cmd
cd /d "C:\Users\Vysakh Raju\Desktop\Jacky's\jackys service portal"
```

Confirm that the prompt is in the folder containing `package.json`:

```cmd
dir package.json
```

If npm says it cannot find `package.json`, you are probably in the older Apps Script project or another folder.

## 4. Install dependencies

Run this once after cloning the repository or when dependencies change:

```cmd
npm install
```

Do not commit `.env` files, passwords, API keys, customer exports, or other private information.

## 5. Start the local PostgreSQL database

From the migration project folder, start Docker PostgreSQL:

```cmd
docker compose up -d
```

Check that the database container is healthy or running:

```cmd
docker compose ps
```

Do not use `docker compose down -v` during normal troubleshooting because the `-v` option deletes the local database volume.

## 6. Apply database migrations

Run migrations before the first test and after pulling changes that include database migrations:

```cmd
npm run db:migrate
```

A successful run may say that there are no migrations to apply. Running this command again is safe because migrations are tracked and applied only once.

## 7. Start the backend and web UI

Keep one terminal open in the project folder and run:

```cmd
npm run dev
```

This starts the local Express server. The browser UI and API are served from the same local server.

Open this address in Chrome or Edge:

```text
http://localhost:3000/portal/
```

The trailing `/portal/` path is the local migration web UI. It does not replace the production Apps Script links.

Useful health checks:

```text
http://localhost:3000/health
http://localhost:3000/api
```

Leave the backend terminal running while using the browser or running the end-to-end tests.

## 8. Test the public complaint form

1. Open `http://localhost:3000/portal/`.
2. Confirm that the page title is **Jacky's Service Portal**.
3. Confirm that **Register a service complaint** is visible.
4. Click **Submit service request** without entering anything.
5. Confirm that field-level messages appear for:
   - Customer type.
   - Customer name.
   - Contact number.
   - Issue description.
6. Confirm that no incomplete complaint is created.
7. Enter a test customer name, phone number, customer type, and issue description. Use clearly fake local test information, not live customer details.
8. Submit the form.
9. Confirm that a success message shows the complaint reference returned by the local API.

The form sends data to `POST /api/public/complaints`.

## 9. Test local staff setup

The local system has a development-only first-time setup flow. It is not the production authentication system.

1. On the portal page, find **Staff workspace**.
2. Open the **First-time setup** tab.
3. Supply the bootstrap token configured for your local environment. Do not place the token in source code or commit it.
4. Enter a local administrator email and password.
5. Submit the setup form.
6. Record the local credentials somewhere safe for this local test only.

If the local environment has already been bootstrapped, use the sign-in tab instead. Do not repeatedly reset or replace local credentials unless you understand the effect on the local database.

## 10. Test staff sign-in and protected complaints

1. Open the **Staff sign in** tab.
2. Enter the local administrator credentials created during bootstrap.
3. Sign in.
4. Confirm that the protected workspace becomes visible.
5. Confirm that the complaint inbox loads from the local API.
6. Use the search and status controls if test complaints exist.
7. Select a complaint and confirm that its details and history are displayed.
8. Click **Sign out**.
9. Confirm that the protected workspace is hidden again.

The browser keeps the short-lived bearer token in memory only. Closing or refreshing the page clears it.

The protected API should reject an unauthenticated request. For example, this should return HTTP 401 when no token is supplied:

```text
GET http://localhost:3000/api/complaints
```

## 11. Run automated tests

Stop any command that is currently using the terminal only if necessary. From the project folder, run the API and contract tests:

```cmd
npm test -- --test-concurrency=1
```

The serial option avoids local PostgreSQL migration races when database-backed tests run at the same time.

Run the browser tests:

```cmd
npm run test:e2e
```

The browser tests use Chromium and the local server at `http://127.0.0.1:3000` by default. The backend must already be running.

If Playwright reports that a browser executable is missing, install the supported browser once:

```cmd
npx playwright install chromium
```

The generated `test-results/` directory is test output and should not be committed.

## 12. Run project verification checks

Run these commands from the project folder:

```cmd
npm run typecheck
npm run build
npm run format:check
npm run db:migrate
```

What they check:

- `typecheck`: TypeScript types without creating build output.
- `build`: production-style TypeScript compilation into `dist/`.
- `format:check`: formatting consistency.
- `db:migrate`: database schema is applied safely.

`dist/` is generated output and should not be committed.

## 13. Stop the local services safely

To stop the development server, focus the terminal running `npm run dev` and press:

```text
Ctrl+C
```

To stop the Docker services without deleting the local database volume:

```cmd
docker compose stop
```

To start them again later:

```cmd
docker compose start
```

Use `docker compose down` only when you intentionally want to remove the containers. Do not add `-v` unless you intentionally want to erase the local database volume and all local test data.

## 14. Troubleshooting

### `npm` cannot find `package.json`

Run:

```cmd
cd /d "C:\Users\Vysakh Raju\Desktop\Jacky's\jackys service portal"
dir package.json
```

The migration project is different from `service-jackys.github.io`, which contains the older Apps Script and landing-page files.

### Docker is unavailable

Open Docker Desktop and wait until it reports that Docker is running. Then check:

```cmd
docker compose ps
```

If the database container is not running, start it again with `docker compose up -d`.

### Port 3000 is already in use

Stop the other local server using port 3000, or identify the process before stopping it. Do not terminate an unknown process without checking what it is. The browser tests can use another URL only if the server and `E2E_BASE_URL` are configured consistently.

### The page loads but buttons do nothing

Check the terminal running `npm run dev` for errors. Then refresh `http://localhost:3000/portal/`. The browser UI loads its JavaScript from `/portal/app.js`; a direct file-open URL such as `file:///.../index.html` will not work correctly.

### Browser tests cannot connect

Start the backend first:

```cmd
npm run dev
```

Then run `npm run test:e2e` from a second terminal in the same project folder.

### Playwright says Chromium is missing

Run:

```cmd
npx playwright install chromium
```

Then rerun `npm run test:e2e`.

### Migration checksum mismatch

Do not delete the Docker volume or edit migration history as a shortcut. First stop concurrent test processes and check whether more than one process is running migrations. Run the affected test or the full API test suite serially:

```cmd
npm test -- --test-concurrency=1
```

If the error continues, stop and review the migration file and repository changes before changing anything in the database.

### A local login or bootstrap request fails

Check that:

- PostgreSQL is running.
- `npm run db:migrate` completed.
- The local environment variables are present where expected.
- You are using local test credentials and the correct local bootstrap token.
- No production credentials or live URLs were copied into the local project.

## 15. Safety reminders

- Google Apps Script remains the production and rollback system.
- Do not change the live Apps Script deployment while testing this migration slice.
- Do not import live customer data into the local database.
- Do not commit `.env`, credentials, bootstrap tokens, API keys, customer exports, deployment URLs, or private IDs.
- Do not push changes until you have reviewed the local commit and are ready to update GitHub.
