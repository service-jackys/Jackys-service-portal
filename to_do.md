# Jacky's Service Portal Migration TODO

This checklist tracks the phase-by-phase migration from the existing Google Apps Script service system to the new service portal. The migration project is still local development and testing work. Google Apps Script remains production and rollback infrastructure until formal cutover approval.

## Completed

- [x] Phase 0: Establish the migration project foundation and local development boundaries.
- [x] Phase 1: Add PostgreSQL schema, migrations, contracts, API foundation, and local startup documentation.
- [x] Phase 2: Add complaint workflow APIs, validation, history, audit events, and integration coverage.
- [x] Phase 3: Add scheduling operations, appointments, technicians, assignment, draft schedules, promotion, and calendar output.
- [x] Phase 4 first web slice: serve the web UI from Express at `/portal/`.
- [x] Phase 4 first web slice: add the public complaint registration form and confirmation state.
- [x] Phase 4 first web slice: add development-only staff bootstrap and sign-in.
- [x] Phase 4 first web slice: add protected complaint inbox, detail, and history views.
- [x] Phase 4 first web slice: keep the browser bearer token in memory only.
- [x] Phase 4 first web slice: preserve server-authoritative authentication and permissions.
- [x] Phase 4 first web slice: add Playwright browser coverage for page rendering, validation, and unauthenticated protected access.
- [x] Add beginner-friendly local testing instructions in `testing_guide.md`.

## Current Phase 4 work

The first browser slice is complete. The next work should extend the service operations experience without changing the existing production Apps Script deployment.

- [x] Add complaint notes controls to the staff complaint detail view.
- [x] Add complaint status update controls with server-authoritative transition handling.
- [x] Add a new service-request workspace for staff follow-up.
- [x] Add appointment scheduling for ready complaints with technician availability lookup.
- [x] Add technician assignment and unassignment UI.
- [x] Add the protected appointment list view and authenticated calendar-file download.
- [x] Add browser tests for authenticated staff workflows.
- [x] Add more role-gated navigation tests for sales, management, and admin permissions.
- [x] Add browser coverage for complaint detail, notes, status changes, scheduling, and assignment.
- [x] Add clear loading, empty, error, unauthorized, forbidden, not-found, conflict, and retry recovery states for protected views.
- [x] Add calendar month/week views and drag-and-drop scheduling through server-authoritative rescheduling.
- [x] Add accessible appointment rescheduling with terminal-state protection, conflict handling, and authoritative refreshes.

## Later phases

### Phase 5: Service operations parity

- [ ] Reproduce the remaining service-center workflows needed for operational parity.
- [ ] Complete customer, branch, technician, appointment, complaint, and service-history journeys.
- [ ] Confirm role and permission behavior against the existing service-center responsibilities.
- [ ] Verify exports and operational reports without exposing live data during development.

### Phase 6: Commercial and pricing features

- [ ] Define the approved pricing and quotation contracts.
- [ ] Add commercial, warranty, extended-warranty, delivery, installation, and service-charge workflows where approved.
- [ ] Add pricing and workbook-related screens only after the operational workflow is stable.
- [ ] Add calculations and integration tests using controlled test fixtures.

### Phase 7: Historical migration and reconciliation

- [ ] Define the approved historical data scope and ownership.
- [ ] Prepare a documented import and reconciliation process.
- [ ] Validate source data quality, duplicates, identifiers, dates, and status mappings.
- [ ] Import only approved data into a controlled staging environment first.
- [ ] Reconcile counts and key records with the Apps Script source.
- [ ] Keep this work not started until the data migration decision is approved.

### Phase 8: Security, staging, and production readiness

- [ ] Replace or formally approve the local-development authentication approach for staging and production.
- [ ] Evaluate Supabase Auth or another approved production identity provider; production Supabase Auth is not started.
- [ ] Configure production secrets outside the repository.
- [ ] Keep OpenAPI and Swagger documentation fail-closed in production.
- [ ] Add rate limiting, monitoring, backups, alerting, recovery procedures, and security review.
- [ ] Run staging acceptance tests with non-production data.
- [ ] Complete dependency, access-control, and infrastructure review.
- [ ] Keep production deployment not started until readiness approval.

### Phase 9: Acceptance, cutover, and rollback

- [ ] Obtain business and service-team acceptance for the completed workflows.
- [ ] Define the cutover date, owners, communication plan, and support process.
- [ ] Document rollback criteria and the tested rollback procedure.
- [ ] Run a controlled production migration only after formal approval.
- [ ] Preserve Google Apps Script as the rollback path until the new system is proven stable.
- [ ] Cut over customer and staff links only after acceptance and release approval.
- [ ] Mark the Apps Script system read-only or retire it only after the approved transition plan is complete.

## Explicitly not started

- [ ] Historical customer-data import.
- [ ] Production Supabase authentication.
- [ ] Production deployment.
- [ ] Production cutover.
- [ ] Changes to the live Apps Script deployment or redirect destinations.

## Recommended next review and testing order

1. Read `testing_guide.md` and confirm that Docker Desktop, Node.js, and npm are available.
2. Start the local PostgreSQL container and run `npm run db:migrate`.
3. Start the backend with `npm run dev`.
4. Open `http://localhost:3000/portal/` and test the public complaint form with fake local data.
5. Test the local first-time staff setup, sign-in, complaint inbox, complaint detail, and sign-out flow.
6. Run `npm test -- --test-concurrency=1`.
7. Run `npm run test:e2e` while the backend is running.
8. Run `npm run typecheck`, `npm run build`, and `npm run format:check`.
9. Review the changed files and local commit before pushing anything to GitHub.
10. After the first web slice is accepted, prioritize complaint notes/status controls, then appointments and technician assignment.

## Migration guardrails

- Google Apps Script remains production and rollback/read-only infrastructure until formal cutover approval.
- Do not alter `/complaints/` or `/portal/` production redirect destinations as part of local migration work.
- Do not import live customer data into local development.
- Do not commit passwords, API keys, bootstrap tokens, `.env` files, customer exports, deployment URLs, Drive IDs, Supabase service-role keys, or other secrets.
- Do not push or deploy this local migration project without reviewing the environment, authentication, data, and rollback implications.
