# WEB FRONTEND GUIDE

## OVERVIEW
React 19 single page application for local first monitoring of Model APIs.

## REPO MAP
- `src/main.tsx` — entry point, React bootstrap, StrictMode.
- `src/App.tsx` — route selector, swaps between PublicDashboard and AdminPanel.
- `src/pages/PublicDashboard.tsx` — read-only monitoring view.
- `src/pages/AdminPanel.tsx` — authenticated admin management view.
- `src/i18n.ts` — internationalization setup.
- `vite.config.ts` — dev server configuration, API proxying.
- `vitest.config.ts` — test environment with jsdom.

## WHERE TO LOOK
- **UI Changes**: Start in `src/pages/` for high level layout.
- **Styling**: Tailwind CSS classes in `.tsx` files.
- **Data Fetching**: Native `fetch` calls in page components.
- **Icons**: Lucide React.
- **Preferences**: `src/services/preferences.ts` for routing logic.

## CONVENTIONS
- **React**: Functional components, React 19 hooks.
- **Types**: Strict TypeScript, ESM, ES2022 target.
- **Styling**: Tailwind utility classes only. No CSS modules.
- **Testing**: Vitest + testing-library. Files named `*.test.tsx`.
- **Mocks**: Global fetch mocking with `vi.stubGlobal`.

## ROUTING LOGIC
- Logic lives in `App.tsx`.
- Checks `getAdminRoute()` to decide which page to render.
- No third party router. Simple conditional rendering for public/admin boundary.

## DEV VS PROD
- **Development**: Vite server on port 5173. Proxies `/api` to port 3000.
- **Production**: `npm run build` outputs to `dist/`. Served by the API server.

## ANTI-PATTERNS
- No external routers. Stick to conditional rendering in `App.tsx`.
- No Axios. Use the native Fetch API.
- No global state managers. Use local state and prop drilling for this scope.
- Do not add cloud assumptions. The app is local first.
- Avoid hardcoding API URLs. Use relative paths for proxying.
