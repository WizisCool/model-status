# SHARED PACKAGE GUIDE

## OVERVIEW
The `shared` package provides the single source of truth for DTOs, interfaces, and common utilities used by both `apps/api` and `apps/web`.

## STRUCTURE
All exports originate from `src/index.ts`.

### Types and Interfaces
- **Monitoring**: `ProbeRunResult`, `ProbePoint`, `ProbeStatusSample`, `ModelSummary`.
- **Dashboard**: `DashboardRange`, `DashboardResponse`, `AdminDashboardResponse`, `UpstreamDashboardSummary`.
- **Management**: `UpstreamSettings`, `AdminSessionResponse`, `AdminSettings`, `AdminSettingsResponse`, `UpdateAdminSettingsRequest`, `AdminActionResponse`.
- **Catalog**: `ModelCatalogEntry`, `SyncModelsResponse`.

### Utilities
- `isDashboardRange(value)`: Type guard for time range strings.
- `rangeStartIso(range, now)`: Calculates ISO timestamp for range start.

## WHERE TO LOOK
- **Frontend data fetching**: Use `DashboardResponse` for public views and `AdminDashboardResponse` for the admin panel.
- **API implementation**: Return `ProbeRunResult` from probe logic and `AdminSettingsResponse` for configuration routes.
- **Time range logic**: Use `DashboardRange` when passing range parameters between frontend and backend.

## CONVENTIONS
- Changes here affect both the server and the frontend. Verify compatibility on both sides.
- Keep logic in this package minimal. Prefer types and pure functions.
- Unit tests for new utilities must go in `src/index.test.ts`.

## IMPORTANT QUIRK
The `package.json` points `main` and `types` to `src/index.ts` to support direct source imports during development in the monorepo. The `files` field includes `dist`, which is used for published versions. You must build the package before publishing or using it outside the local workspace context.
