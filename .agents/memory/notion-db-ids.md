---
name: Notion Database IDs
description: Durable decision about how Notion DB IDs are handled in this project
---

# Notion DB IDs — Approach

**Decision:** DB IDs are hardcoded as fallbacks in the API server route file (non-secret identifiers, safe to do). They can be overridden via `NOTION_TASKS_DB_ID` / `NOTION_CLIENTS_DB_ID` env vars.

**Why:** Avoids needing secrets config for IDs that aren't credentials. The right DBs were identified by querying `/api/notion/databases` and inspecting titles + property names.

**Key finding:** The main Tasks DB uses "Task" as the title property (not "Name"). The Clients/People DB is titled "People" in Notion.

**How to apply:** When adding new Notion DB connections, always check `/api/notion/databases` first to find the right ID and property names before hardcoding.
