<div align="center">
  <img src="apps/web/public/project-icon.svg" width="88" alt="Model Status icon" />
  <h1>Model Status</h1>
  <p><strong>Local-first monitoring for OpenAI-compatible model APIs.</strong></p>
  <p>
    A public read-only status dashboard, a private admin workspace, SQLite-backed history,
    configurable retries, and a single-process production deployment model.
  </p>
  <p>
    <a href="#quick-start">Quick Start</a> ·
    <a href="#docker">Docker</a> ·
    <a href="#configuration">Configuration</a> ·
    <a href="#architecture">Architecture</a>
  </p>
  <p>
    <a href="https://github.com/WizisCool/model-status/actions/workflows/docker-image.yml">
      <img src="https://github.com/WizisCool/model-status/actions/workflows/docker-image.yml/badge.svg" alt="Docker image workflow" />
    </a>
  </p>
</div>

## Overview

Model Status is a local-first monitoring panel for model APIs that expose an OpenAI-compatible interface.

It continuously:

- syncs model catalogs from configured upstreams
- runs real probe requests against each visible model
- records connectivity, first-token, and total latency in SQLite
- calculates dashboard availability from final visible status outcomes
- serves both the API and the built frontend from one process in production

The public `/` dashboard is read-only. The private `/admin` workspace manages upstreams, settings, scheduling, visibility, ordering, and on-demand actions.

## Highlights

- Local-first by default. No cloud telemetry is required.
- SQLite is the single source of truth for settings and monitoring history.
- Public dashboard supports fixed ranges: `90m`, `24h`, `7d`, `30d`.
- Admin settings control probe interval, timeout, concurrency, retry counts, score thresholds, and branding text.
- Retry logic is configurable for both degraded results and hard failures.
- Public availability is based on the final visible status outcome, matching the frontend status indicators.
- Frontend supports persisted preferences for range, view mode, language, and theme.
- Production mode can run as a single container that serves both API and frontend assets.

## Screens and Behavior

- `GET /`
  Public monitoring dashboard for operators, customers, or teammates.
- `GET /admin`
  Authenticated control panel for upstream management and runtime settings.
- `GET /api/dashboard`
  Public read-only dashboard data.
- `GET /api/admin/*`
  Authenticated administration APIs.

## Tech Stack

- Node.js 24+
- npm `11.10.1`
- TypeScript (strict mode)
- Native Node HTTP server
- React 19 + Vite
- Tailwind CSS
- SQLite
- Vitest
- GitHub Actions + GHCR for Docker image publishing

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Create your local environment file

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. Set bootstrap values

These values are bootstrap-only. Runtime settings such as upstreams, intervals, thresholds, and retry counts are managed in the admin UI and stored in SQLite.

```env
PORT=3000
HOST=0.0.0.0
WEB_ORIGIN=http://localhost:5173
DATABASE_FILE=./data/model-status.db
ADMIN_BOOTSTRAP_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=change-me
SESSION_SECRET=replace-this-in-production
```

### 4. Start in development

```bash
npm run dev
```

Default local URLs:

- API: `http://localhost:3000`
- Web: `http://localhost:5173`

### 5. Build for production

```bash
npm run build
npm run start
```

When `apps/web/dist` exists, the API process serves the frontend directly.

## Docker

This repository includes a production Dockerfile and a GitHub Actions workflow that builds and publishes images to GHCR.

### Build locally

```bash
docker build -t model-status:local .
```

### Run locally

```bash
docker run --rm -p 3000:3000 \
  -e ADMIN_BOOTSTRAP_PASSWORD=change-me \
  -e SESSION_SECRET=replace-this \
  -v model-status-data:/app/data \
  model-status:local
```

### Pull from GHCR

```bash
docker pull ghcr.io/wiziscool/model-status:latest
```

## Configuration

### Bootstrap-only environment variables

These are read from `.env` / `.env.local` on startup:

| Variable | Purpose | Default |
|---|---|---|
| `HOST` | Server bind host | `0.0.0.0` |
| `PORT` | Server port | `3000` |
| `WEB_ORIGIN` | Allowed admin origin | `http://localhost:5173` |
| `DATABASE_FILE` | SQLite database path | `./data/model-status.db` |
| `ADMIN_BOOTSTRAP_USERNAME` | Initial admin username | `admin` |
| `ADMIN_BOOTSTRAP_PASSWORD` | Initial admin password | empty |
| `SESSION_SECRET` | Session signing secret | empty |

### Runtime-managed settings

These are stored in SQLite and edited from `/admin`:

- site title and subtitle
- summary card visibility
- probe interval
- catalog sync interval
- probe timeout
- probe concurrency
- max tokens
- temperature
- degraded retry attempts
- failed retry attempts
- score thresholds
- upstream definitions and API keys

## Verification

```bash
npm run test
npm run typecheck
npm run build
```

## Architecture

```text
apps/api      HTTP server, auth, scheduler, probes, persistence, frontend hosting
apps/web      Public dashboard + admin workspace
packages/shared  Shared DTOs, ranges, repository constants
data/         Local SQLite database files
```

Production flow:

1. The API boots with bootstrap env values.
2. SQLite runtime settings are loaded or initialized.
3. The scheduler runs model sync and probe cycles in-process.
4. Probe results are persisted.
5. The public and admin dashboards read aggregated data from SQLite.
6. In production, the API serves the built frontend from `apps/web/dist`.

## Repository Policy

This repository intentionally does not include local operator files or assistant-specific workspace data.

Ignored / excluded from public version control:

- `.codex/`
- all `AGENTS.md`
- local `.env*`
- SQLite database files under `data/`
- local helper script `check-db-status.ts`
- cookies, temp files, and local build artifacts

## API Surface

### Public

- `GET /api/health`
- `GET /api/dashboard?range=90m|24h|7d|30d`

### Admin

- `GET /api/admin/session`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`
- `GET /api/admin/dashboard`
- `PUT /api/admin/models`
- `POST /api/admin/actions/sync-models`
- `POST /api/admin/actions/run-probes`

## License

Add your preferred license before making the repository broadly public.
