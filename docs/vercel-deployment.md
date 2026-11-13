# Vercel Functions and PostgreSQL deployment

## Diagnosis and scope

On November 13, 2026, both deployed `/api/health` and `/api/events` returned HTTP 404 with `X-Vercel-Error: NOT_FOUND`, not the application's JSON errors. The source had no `api/` Vercel Function and no `vercel.json`; `npm run dev` only started `server/index.js` listening on localhost. A static deployment does not run this development command as a permanent backend. Relative frontend requests were correct, but no deployed function handled them.

The prepared implementation uses `api/index.js` for Vercel and keeps `server/index.js` for local development. Both reuse the asynchronous route handler, validation and inventory logic. The frontend still uses same-origin `/api/*` URLs. `npm run build` copies only HTML and `assets/` to generated `public/`; database files, source code, environment files and tests never become public static assets. `vercel.json` routes API paths to the function and sets `NODEJS_HELPERS=0` so Vercel does not consume the raw JSON stream before the application's size, UTF-8 and parsing checks.

Hosted requests require PostgreSQL and never fall back to SQLite or `/tmp`. Local development uses PostgreSQL when `DATABASE_URL` is set and retains offline SQLite otherwise. No schema migration, catalog seeding or SQLite import runs during a function invocation or static build.

These files are prepared locally. They do not prove a successful Vercel deployment, and no live attendee data has been migrated without database access.

Initialization failures now emit a sanitized `eventease_initialization_failed` JSON entry in Vercel Runtime Logs. It contains only fixed initialization stages, allowlisted error categories/codes/types and boolean presence checks for server configuration. It never includes exception messages/stacks, URLs, certificate text, tokens or attendee data. The public HTTP 503 response stays unchanged. Search logs for this event to distinguish missing/invalid URLs, malformed CA certificates, import failures, organizer configuration and actual TLS/network/database authentication failures. Function initialization performs `SELECT 1` before caching its request handler and closes a failed pool before retrying. CA parsing accepts real newlines and literal `\n` sequences, but rejects quoted/malformed/non-CA PEM data.

## 1. Provision a database

Create a PostgreSQL project in Supabase or Neon. Choose a region near the Vercel function region. Obtain the provider's **pooled** PostgreSQL connection string for the runtime; URL-encode special characters in passwords. For Supabase, use the Connect dialog's transaction pooler for serverless traffic. For Neon, use the pooled endpoint. Use a separate preview/test database instead of pointing previews at production attendee data.

Keep the connection URL entirely server-side. No Supabase service-role key or database password belongs in `assets/`, browser storage, Git, screenshots or chat. This implementation connects through `pg`, not a browser database SDK.

The schema is named `eventease`, not `public`. Do not add it to Supabase's exposed Data API schemas. Tables have RLS enabled with no browser policies, and PUBLIC privileges are revoked. The migration and runtime connection must use the table-owning database role (or a separately provisioned trusted role with appropriate RLS policies). An `anon` or `authenticated` browser key cannot run this API. Do not change RLS to permit public attendee reads.

TLS certificates are verified on hosted connections. If the provider requires a custom root CA, supply its PEM certificate as `DATABASE_CA_CERT`; never set `rejectUnauthorized: false`. Only loopback PostgreSQL connections disable TLS for isolated local tests.

For local connections, the client also accepts `DATABASE_CA_CERT_FILE` (a certificate file path), or automatically loads `supabase-ca.crt` from the project root when running outside Vercel. The local certificate is excluded from Git and Vercel uploads. `DATABASE_CA_CERT` takes precedence over the file. Hostname verification remains enabled, with the connection hostname supplied as TLS `servername`. In Vercel, configure `DATABASE_CA_CERT` as the complete PEM certificate text when required; the local fallback file is not deployed.

## 2. Set local secrets and migrate

Use [config/environment.example](../config/environment.example) as a placeholder reference. Create an ignored `.env.local` yourself; `npm.cmd run dev` and database commands load it. Set:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled runtime PostgreSQL URL; required on Vercel |
| `MIGRATION_DATABASE_URL` | Optional direct/session URL for migrations, seed/import; keep in local shell or `.env.local`, not required in Vercel |
| `BOOKING_TOKEN_SECRET` | Stable random secret, at least 32 bytes, for booking receipt signatures; required for hosted checkout |
| `ORGANIZER_CREDENTIALS` | JSON array of organizer token hashes and explicit event ID lists; defaults to `[]`, disabling organizer reads |
| `DATABASE_CA_CERT` | Optional trusted root certificate PEM |

Generate a booking secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and store its output privately. Do not paste it into a tracked file. Local SQLite development without a secret generates an ephemeral key and warns that receipts become invalid on restart. Set a stable key to preserve access. Hosted functions never generate fallback keys.

Run from the project root:

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

`db:migrate` applies the idempotent schema inside a transaction and takes a migration advisory lock. `db:seed` inserts only the 22 fictional catalog events, without overwriting events or fabricating registrations/bookings. `/api/health` must return HTTP 200 with `database: "postgresql"`; `/api/events` must return JSON catalog data. Failed database health returns 503 rather than a false success.

## 3. Preserve existing SQLite attendee data, if needed

Stop the local server and take a private backup of the SQLite database. Do this before allowing hosted writes. After migrating the PostgreSQL schema, run:

```powershell
npm.cmd run db:import -- "C:\absolute\path\to\server\data\eventease.sqlite"
```

The importer opens SQLite read-only, locks destination tables, refuses a destination containing registrations or bookings, preserves event IDs, booking references, attendee records, item prices, totals and timestamps, and resets the registration identity sequence. It updates conflicting event records from the source, so use it only during the initial cutover. Any error rolls back all inserts. It does not delete the original database. It logs no attendee details. Do not rerun this against an active production database or use it as an ongoing synchronization job. Events beyond the source catalog remain untouched.

Existing bookings retain their references, but they have no newly issued customer receipt token. An authorized organizer can read them; the existing browser booking cache still displays them. A reference alone no longer grants API access to personal data.

## 4. Configure organizer access

Organizer authentication is server-to-server bearer API-key authentication, not an end-user login screen. Generate one separate high-entropy token per organizer (at least 32 random bytes), hand it to that organizer privately, and store only its SHA-256 hex hash in `ORGANIZER_CREDENTIALS`:

```text
[{"tokenHash":"<64 lowercase hex characters>","eventIds":["after-hours","host-<actual event ID>"]}]
```

Use Node's `createHash('sha256').update(token).digest('hex')` locally to hash the token without sending it to a website. Explicit event IDs are the authorization boundary: wildcard grants are rejected, event ownership is not inferred from a submitted organizer name, and a new event is not automatically granted to an API-key holder. An operator must update the mapping for that event and redeploy after environment changes. Revoke a key by removing its mapping. Never embed organizer keys in frontend JavaScript, URLs or browser storage.

`GET /api/events/:id/registrations` returns `{ "registrations": [{ "registration_id", "event_id", "full_name", "email" }], "count" }` only with `Authorization: Bearer <organizer token>` authorized for that event. `GET /api/bookings/:reference` requires either an organizer key authorized for the booking's event or that booking's signed receipt token. Missing/invalid/expired tokens return 401; valid credentials outside their scope return 403. Error bodies preserve `{ "error": { "code", "message" } }`. Organizer data is never returned by public event lists or details.

`POST /api/bookings` keeps the existing JSON response and also sends `X-Booking-Token`. The frontend stores this receipt separately under `crescent.receipt.<reference>`; it never treats it as an organizer key. Receipt tokens expire after 30 days and authorize only one booking. Use the token as a Bearer header for API lookup. Rotating `BOOKING_TOKEN_SECRET` invalidates all old receipts. Registration POST returns only the submitting attendee's own result; it does not list anyone else.

Event creation remains a public demo endpoint because it exposes no attendee records. A public commercial service would also need organizer user accounts, rate limiting, abuse controls, retention policies and real payment integration. This change does not introduce a fake sign-in UI or claim those features exist.

## 5. Vercel project settings (after code review)

Do not push or redeploy until the changes have been reviewed. In the existing Vercel project:

1. Confirm the Git repository and project root point at this folder, production branch `main`.
2. Framework preset: **Other**. Node.js version: **22.x** (local requirement remains 22.13+).
3. Use `npm run build` as build command and `public` as output directory; these are also specified in `vercel.json`. Install with `npm ci`. Do not set a Python command or `npm run dev` as the build command.
4. Set `DATABASE_URL`, `BOOKING_TOKEN_SECRET`, optional `ORGANIZER_CREDENTIALS` and optional `DATABASE_CA_CERT` in Vercel Environment Variables for the intended environments. Use separate preview credentials. The repository supplies only the nonsecret `NODEJS_HELPERS=0` setting.
5. Verify `api/index.js` appears as a Node function in the build output, alongside static pages. Ensure no dashboard override or old SPA rewrite routes `/api/*` to HTML.
6. Deploy a preview after review; test it before promoting it. Environment changes require a new deployment.

If deployment protection is enabled, use an authenticated preview session for testing. No Vercel API token is required in the website source.

## 6. Tests and acceptance checks

```powershell
npm.cmd test
npm.cmd run test:postgres
npm.cmd run build
```

The first suite verifies offline SQLite behavior, validation, access control and frontend logic. PostgreSQL-only tests are explicitly skipped there. `test:postgres` starts a real PostgreSQL server in an isolated temporary cluster, migrates twice to check idempotence, seeds fictional events and runs the API contract plus PostgreSQL persistence, rollback, Vercel-entry and SQLite-import tests. It does not connect to Supabase/Neon or write to a hosted database. Its development-only `embedded-postgres` package supplies platform binaries; if your package manager blocks install scripts, the test runner rehydrates required symlinks using the package's documented option. It never creates an OS user. Linux root-only environments need a non-root test process.

Before declaring the preview successful, verify:

- `/` and existing HTML pages/assets return the website, not server source.
- `/api/health` returns 200 JSON with `database: "postgresql"`; `/api/events` returns 200 JSON and its filters work.
- Create one **clearly labeled test event** dated in the future; submit a real HTTP registration and booking to that event. Record returned IDs and verify the rows in PostgreSQL privately. Test duplicate email and invalid input.
- Verify two simultaneous attempts at its final seat yield one 201 and one 409, including mixed registration/booking attempts. PostgreSQL uses `SELECT ... FOR UPDATE` on the event row before reading inventory, on the same client through COMMIT/ROLLBACK.
- Verify the same booking after a fresh function instance/redeployment. Check attendee reads return 401 with no credential and 403 for a different event, while the correctly scoped organizer key or booking receipt succeeds.
- Verify missing configuration and database outages return JSON errors, not fabricated successes; inspect Vercel logs without logging credentials or attendee payloads.

Only mark deployment complete after these hosted checks. Local tests cannot validate your provider credentials, TLS chain, networking, Vercel project overrides or actual live routing.

## References

- [Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel raw Node helper configuration](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration)
- [Vercel rewrites](https://vercel.com/docs/routing/rewrites)
- [node-postgres transactions](https://node-postgres.com/features/transactions)
- [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
