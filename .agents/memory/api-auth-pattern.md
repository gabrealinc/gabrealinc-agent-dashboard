---
name: Dashboard API auth pattern
description: How connector-backed routes are protected with Replit Auth session cookies
---

# Dashboard API Auth Pattern

## Rule
`/api/notion/*` and `/api/gcal/*` are protected by `requireAuth` middleware, which checks `req.isAuthenticated()` from Replit Auth session cookies.

**Why:** Earlier approaches (token in tmp file, baked-in Vite define, public token endpoint) were all rejected — any value that reaches the browser can be extracted. The only correct solution is server-side session cookies via Replit Auth (OIDC + PKCE).

**How it works:**
1. Replit Auth OIDC flow: `/api/login` → Replit OIDC → `/api/callback` → httpOnly session cookie set in DB
2. `authMiddleware` (runs on every request) loads user from session, sets `req.user` and `req.isAuthenticated()`
3. `requireAuth` middleware on connector routes returns 401 if `!req.isAuthenticated()`
4. Frontend calls `/api/auth/user` (cookie automatically sent) to check auth state via `useAuth()` hook
5. `AuthGate` in `App.tsx` shows login button if unauthenticated, dashboard if authenticated
6. All `apiFetch()` calls include `credentials: "include"` so the session cookie is sent automatically

**Sessions stored in:** PostgreSQL `sessions` table (Drizzle, via `@workspace/db`)
**Users stored in:** PostgreSQL `users` table (upserted on each login)

**How to apply:** Any new connector-backed route should use `requireAuth` middleware. Do NOT add any shared-secret or token-based auth on top — session cookies are sufficient and correct.
