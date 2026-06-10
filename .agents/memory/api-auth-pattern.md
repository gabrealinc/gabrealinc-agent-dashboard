---
name: Dashboard API auth pattern
description: How connector-backed routes are protected without manual secrets config
---

# Dashboard API Auth Pattern

## Rule
`/api/notion/*` and `/api/gcal/*` are protected by a per-process `SESSION_TOKEN` (64-char hex, generated fresh on each server start via `randomBytes(32)`).

**Why:** The connectors SDK gives server-side access to Notion and Google Calendar — unauthenticated endpoints would expose that data to any caller. A static secret requires manual setup. The session-token approach is secure-by-default with zero config.

**How it works:**
1. Server generates `SESSION_TOKEN` at startup (`dashboardAuth.ts`)
2. Frontend fetches it once from `/api/auth/session-token` (CORS-gated to Replit/localhost origins)
3. Frontend attaches `X-Dashboard-Secret: <token>` to all subsequent `/api/*` calls via `apiFetch()`
4. `dashboardAuth` middleware rejects any request missing the correct token with 401

**How to apply:** Any new connector-backed route should use `dashboardAuth` middleware. The `/api/auth/session-token` endpoint must remain unauthenticated (no middleware) so the frontend can bootstrap.
