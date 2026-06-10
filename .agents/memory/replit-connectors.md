---
name: Replit Connectors SDK usage
description: Gotchas for using @replit/connectors-sdk with Notion and Google Calendar in this project
---

# Replit Connectors SDK — Key Lessons

**Why:** These weren't obvious from the SDK docs and took debugging to find.

## Google Calendar proxy path prefix
The GCal connector proxy requires `/calendar/v3/` prefix (not `/` or `/v3/`):
- CORRECT: `/calendar/v3/calendars/primary/events`
- WRONG: `/calendars/primary/events` → returns 404 HTML
- WRONG: `https://www.googleapis.com/...` → returns HTML

## Notion proxy path prefix
Notion works with `/v1/` as documented:
- CORRECT: `/v1/databases/{id}/query`
- CORRECT: `/v1/search`

## Time display from GCal
Do NOT use `new Date(isoString).toLocaleTimeString()` on the server — it converts to server UTC and shows wrong times.
Instead, extract hours/minutes directly from the ISO string (`T06:00:00-07:00`) since the offset is embedded.
Pattern: `raw.match(/T(\d{2}):(\d{2})/)`

## Both steps always required
After `addIntegration`, also call `proposeIntegration` — without it the credential proxy at runtime returns nothing even though the account is authorized.

## SDK location in monorepo
Installed per-package: `artifacts/api-server/node_modules/@replit/connectors-sdk/index.js`
