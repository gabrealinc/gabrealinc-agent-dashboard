---
name: Dashboard API auth pattern
description: How connector-backed routes are protected without manual secrets config
---

# Dashboard API Auth Pattern

## Rule
`/api/notion/*` and `/api/gcal/*` are protected by a per-process `SESSION_TOKEN` (64-char hex, generated fresh on each server start via `randomBytes(32)`). The token is **never served over HTTP**.

**Why:** The connectors SDK gives server-side access to Notion and Google Calendar. An unauthenticated endpoint would expose that data. A public "fetch-your-token" endpoint was rejected as equivalent to no auth (curl with no Origin bypasses CORS). The solution is to bake the token into the frontend at Vite build time.

**How it works:**
1. API server generates `SESSION_TOKEN` at startup (`dashboardAuth.ts`) and writes it to `/tmp/gabreal-api-token`
2. Vite config (`vite.config.ts`) reads that file at startup and injects it as `__API_TOKEN__` via `define`
3. Frontend reads `__API_TOKEN__` (baked into bundle, never an HTTP call) and attaches `X-Dashboard-Secret: <token>` on all `apiFetch()` calls
4. `dashboardAuth` middleware rejects any request missing the correct token with 401

**Critical ordering:** API server must start before Vite so the token file exists when Vite reads it. If Vite starts first, restart the dashboard workflow after API is running.

**How to apply:** Any new connector-backed route should use `dashboardAuth` middleware. Do NOT add any HTTP endpoint that returns the token — that defeats the protection.
