# API PROJECT GUIDE

## OVERVIEW
"model status" API is a Node.js/TypeScript server built on `node:http`. It manages SQLite monitoring data and in-process scheduling.

## STRUCTURE
- `src/server.ts` (263 lines): Native HTTP server and route dispatching.
- `src/config.ts`: Bootstrap-only environment variables (port, DB path).
- `src/db.ts` (624 lines): SQLite schema, migrations, and low-level persistence.

### Services (`src/services/`)
- `auth.ts`: Admin session management and cookie authentication.
- `settings.ts`: Runtime configuration management (from SQLite).
- `catalog.ts`: Model synchronization with configured upstreams.
- `probe.ts` (331 lines): SSE streaming probe execution with retries.
- `dashboard.ts`: Public and admin data aggregation for UIs.
- `scheduler.ts`: In-process cron-like job execution.

## WHERE TO LOOK
- **Routes/Server**: `src/server.ts` for all HTTP request handling.
- **Database Schema**: `src/db.ts` for monitoring history and settings tables.
- **Upstream Sync**: `src/services/catalog.ts` for model list updates.
- **Probe Logic**: `src/services/probe.ts` for probe execution and SSE.
- **Scheduled Tasks**: `src/services/scheduler.ts` for periodic sync/probes.

## ROUTES
### Public (Read-only)
- `GET /api/health`
- `GET /api/dashboard`: Accept `range=90m|24h|7d|30d`.

### Admin (Auth required)
- `GET/PUT /api/admin/settings`: Runtime configuration.
- `GET /api/admin/session`: Check current authentication state.
- `POST /api/admin/login`: Create session.
- `POST /api/admin/logout`: Clear session.
- `GET /api/admin/dashboard`: Detailed admin view data.
- `POST /api/admin/actions/sync-models`: Trigger immediate catalog sync.
- `POST /api/admin/actions/run-probes`: Manually start probe cycle.

## CONVENTIONS
- **Runtime Persistence**: Use `src/db.ts` for all state; `.env` is bootstrap-only.
- **Error Handling**: Failures should be recorded in SQLite, not crash the process.
- **Data Location**: SQLite files reside in `data/*.db` (gitignored).
- **Single Process**: The API serves the web frontend distribution if it exists.

## ANTI-PATTERNS
- **Hardcoded Upstreams**: Do not define permanent providers; use SQLite for all upstreams.
- **Runtime Environment**: Do not store dynamic settings in `.env`.
- **Public Disclosure**: Do not expose granular probe logs to unauthenticated users.
- **Process Instability**: Avoid unhandled rejections; use bounded retries for network calls.
