---
name: Notion Database IDs
description: Hardcoded fallback Notion DB IDs for the Gabreal dashboard
---

# Notion Database IDs

These are hardcoded as fallbacks in `artifacts/api-server/src/routes/notion.ts`.
Can be overridden via env vars `NOTION_TASKS_DB_ID` and `NOTION_CLIENTS_DB_ID`.

**Why:** The DB IDs are stable non-secret identifiers — safe to hardcode so the app works without any secrets configuration.

| DB Name | Notion Title | ID |
|---|---|---|
| Tasks | "Tasks" | `222a4fa7-7eaf-812b-8707-d4f1da02d778` |
| Clients/People | "People" | `d3da4fa7-7eaf-82df-b0d8-014512d331ec` |

**Other notable DBs found:**
- Clients (different): `222a4fa7-7eaf-81478e38c6be0003d2e9` (empty — not the right one)
- Substack Posts: `318a4fa7-7eaf-80ea-bde4-f029034035e2`
- Agent Reports: `375a4fa7-7eaf-80a9-9103-d5fe01200457` (Amber), `375a4fa7-7eaf-8030-8655-c96812954ef1` (Sage), etc.
- Comms Log: `8fda87c9-d071-434f-b3b2-130fbfdb1f83`

**Task property names:**
- Title: "Task" (not "Name")
- Due: "Due Date"
- Status: "Status" (select)
- Client: "Client" (relation)
