# Gabreal Command Center

A personal operating system for Gabby — command center dashboard covering schedule, clients, finance, intelligence, agents, Substack, and spirit/wellness.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (`artifacts/gabreal-dashboard/`)
- API: Express 5 (`artifacts/api-server/`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- External: Supabase Edge Functions (Notion, Gmail, GHL, QuickBooks)

## Where things live

- `artifacts/gabreal-dashboard/src/pages/Dashboard.tsx` — main dashboard UI (all 7 views)
- `artifacts/gabreal-dashboard/src/index.css` — design system (warm peach palette, Playfair/Inter fonts)
- `artifacts/api-server/src/routes/supabase-proxy.ts` — proxies `/api/<name>` calls to Supabase edge functions
- `lib/api-spec/openapi.yaml` — API contract source of truth

## Architecture decisions

- The dashboard is a single-page app with 7 tab-switched views (Home, Clients, Finance, Intelligence, Substack, Spirit, Agents) — no routing needed.
- All Supabase edge function calls are proxied through the Express API server (`/api/<name>`) so secrets never reach the browser.
- Mock/static data is used for all views until `SUPABASE_URL` and `SUPABASE_ANON_KEY` secrets are configured in Replit Secrets.
- Design system uses CSS custom properties (not Tailwind theme) to exactly match the original warm peach palette from the Lovable/v0 design spec.

## Product

A personal command center for Gabby (Gab Real Inc) with:
- **Home**: Today's schedule, inbox attention items (from Amber agent), Sage chat, task priorities, Mac Mini remote control
- **Clients**: Active client roster synced from Notion
- **Finance**: Revenue stats, monthly chart, invoice tracker (via Dave agent / QuickBooks + GHL)
- **Intelligence**: AI-curated industry briefs (via Nancy agent)
- **Substack**: Newsletter writing and publishing interface (Notion-backed)
- **Spirit**: Cycle-phase wellness guidance (via Elle agent)
- **Agents**: Status and activity log for all 8 AI agents, Mac Mini wake/screen-share controls

## Secrets needed

Set these in Replit Secrets to connect live data:
- `SUPABASE_URL` — e.g. `https://xxxx.supabase.co`
- `SUPABASE_ANON_KEY` — the anon public key

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The API server proxies all `/api/<name>` requests to `SUPABASE_URL/functions/v1/<name>`. If secrets aren't set, the proxy returns a 500 with a helpful message — the frontend still loads with static mock data.
- Notion keys live in Supabase edge function secrets, not in this Replit environment.
- Mac Mini Wake-on-LAN requires `MAC_MINI_TAILSCALE_IP` and `MAC_MINI_MAC_ADDRESS` secrets.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Original design spec: `.migration-backup/DASHBOARD-SPEC.md`
- Original server.js reference: `.migration-backup/replit/server.js`
