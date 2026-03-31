# PROJECT GUIDE

## WHAT THIS REPO IS
- `model status` is a local-first Model API Monitoring Panel.
- Public `/` is read-only monitoring.
- Private `/admin` owns upstreams, settings, sync, and probe actions.
- SQLite is the single source of truth for runtime settings and monitoring history.

## PROJECT STRUCTURE
This repository is an npm workspaces monorepo. It keeps concerns separated between the server, the frontend, and shared logic.
- `apps/api`: Express server for model syncing, probing, and persistence.
- `apps/web`: React + Vite dashboard interface.
- `packages/shared`: Shared TypeScript types and DTOs.

## REPO MAP
- `apps/api/src/config.ts`: bootstrap-only env loading.
- `apps/api/src/db.ts`: schema, migrations, and persistence helpers.
- `apps/api/src/services/settings.ts`: runtime defaults and admin-managed settings.
- `apps/api/src/services/catalog.ts`: `/models` sync per upstream.
- `apps/api/src/services/probe.ts`: probe execution and bounded retries.
- `apps/api/src/services/dashboard.ts`: public/admin dashboard shaping.
- `apps/api/src/services/scheduler.ts`: in-process scheduling.
- `apps/api/src/server.ts`: route exposure and public/admin boundary.
- `apps/web/src/pages/PublicDashboard.tsx`: public UI.
- `apps/web/src/pages/AdminPanel.tsx`: admin UI.
- `packages/shared/src/index.ts`: shared DTOs.

## WHERE TO LOOK
Detailed package-level guides are available in their respective directories.

| Package | Purpose | Guide |
|---------|---------|-------|
| `apps/api` | API Server | [AGENTS.md](apps/api/AGENTS.md) |
| `apps/web` | Frontend UI | [AGENTS.md](apps/web/AGENTS.md) |
| `packages/shared` | Shared Types | [AGENTS.md](packages/shared/AGENTS.md) |

## BOOTSTRAP RULES
- `.env` / `.env.example` keep bootstrap-only values: host, port, web origin, database path, admin bootstrap user/password, session secret.
- Upstreams, branding, thresholds, intervals, and retry settings belong in SQLite and are managed through `/admin`.
- Fresh start means no DB files under `data/`. Startup must recreate a working baseline.

## OPERATOR EXPECTATIONS
- Public routes must stay read-only.
- Old public mutating routes must stay unavailable.
- Admin routes must require authenticated session.
- Default upstream is not special at runtime. Empty-state handling must be valid.

## CONVENTIONS
### Technology Stack
- Node 24+ is recommended.
- npm@11.10.1 is the pinned package manager.
- TypeScript uses ES2022, ESM, and strict mode with `noUncheckedIndexedAccess`.

### Testing and Formatting
- Vitest is used for testing. Web tests use jsdom.
- Test files (`.test.ts`) are colocated with the source code.
- No ESLint or Prettier configs are present. Follow the existing code style.

### Workflow
- Completed implementation rounds should end with a git commit that cleanly captures the delivered change.

## ANTI-PATTERNS
- Do not hardcode undeletable upstreams.
- Do not put runtime upstream or API settings back into `.env`.
- Do not expose detailed probe history on the public dashboard API.
- Do not add cloud-only assumptions or multi-tenant scope.
- Avoid crashing the process on runtime errors. Record failures instead.
- Avoid surfacing internal errors in the public UI.
- Never assume the default upstream is special.
- Forbidden: cloud telemetry by default.

## COMMANDS
Run these from the root directory to manage the entire monorepo.

```bash
# General Setup
npm install

# Development
npm run dev

# Verification
npm run test
npm run typecheck
npm run build

# Production
npm run start
```

Use workspace filters for specific packages:
- `npm run dev -w apps/api`
- `npm run test -w apps/web`
