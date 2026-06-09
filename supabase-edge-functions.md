# Supabase Edge Functions — Gab Real Inc Dashboard
> Deploy these in Supabase → Edge Functions. They proxy your Notion API so the dashboard doesn't expose your key client-side.
> Last updated: 2026-06-03 — rewrote ember-emails to read from Comms Log DB (was incorrectly reading from Sage Daily Brief page). Fixed resolve-email-flag stub (was returning ok without touching Notion).

---

## SETUP (one time)

1. In Supabase → Project Settings → Environment Variables, add:
   ```
   NOTION_API_KEY = secret_xxxxxxxxxxxxxxxxxxxx
   NOTION_TASKS_DB = 222a4fa7-7eaf-814b-94e1-000b3c08ca36
   NOTION_COMMS_LOG_DB = 8fda87c9-d071-434f-b3b2-130fbfdb1f83
   NOTION_BRIEF_PAGE = 337a4fa7-7eaf-813e-a95c-dda143c04a0a
   NOTION_MAE_LOG_PAGE = <id of the "Mae Daily Log" Notion page — create it first, then paste its id here>
   ```

2. Deploy each function below via Supabase CLI or the dashboard.

---

## 1. `notion-tasks` — GET today/tomorrow's tasks

```typescript
// supabase/functions/notion-tasks/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NOTION_KEY = Deno.env.get("NOTION_API_KEY")!;
const DB_ID = Deno.env.get("NOTION_TASKS_DB")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const res = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter: {
        and: [
          {
            or: [
              { property: "Due Date", date: { equals: today } },
              { property: "Due Date", date: { equals: tomorrow } },
              { property: "Due Date", date: { before: today } },
            ],
          },
          { property: "Status", status: { does_not_equal: "Done" } },
          { property: "Status", status: { does_not_equal: "Archived" } },
        ],
      },
      sorts: [{ property: "Due Date", direction: "ascending" }],
    }),
  });

  const data = await res.json();

  const tasks = (data.results || []).map((page: any) => ({
    id: page.id,
    name: page.properties?.Name?.title?.[0]?.plain_text || "Untitled",
    status: page.properties?.Status?.status?.name || "Not Started",
    priority: page.properties?.Priority?.select?.name || "medium",
    dueDate: page.properties?.["Due Date"]?.date?.start || null,
    project: page.properties?.Project?.select?.name || null,
  }));

  return new Response(JSON.stringify({ tasks }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
```

---

## 2. `update-notion-task` — POST to change a task's status

```typescript
// supabase/functions/update-notion-task/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NOTION_KEY = Deno.env.get("NOTION_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { taskId, status } = await req.json();

  const res = await fetch(`https://api.notion.com/v1/pages/${taskId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${NOTION_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        Status: { status: { name: status } },
      },
    }),
  });

  const ok = res.ok;
  return new Response(JSON.stringify({ ok }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
```

---

## 3. `amber-emails` — GET Amber's flagged items from Comms Log DB

> Previously called `ember-emails` and read from Sage Daily Brief page (wrong). Now reads directly from Comms Log DB filtered to needs_attention = true.

```typescript
// supabase/functions/amber-emails/index.ts
// Reads Amber's flagged items from the Comms Log Notion database.
// Filters: needs_attention = true, source_type = Gmail or Slack
// Returns structured email/message cards for the dashboard.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NOTION_KEY = Deno.env.get("NOTION_API_KEY")!;
const COMMS_LOG_DB = Deno.env.get("NOTION_COMMS_LOG_DB")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const res = await fetch(`https://api.notion.com/v1/databases/${COMMS_LOG_DB}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter: {
        property: "Needs Attention",
        checkbox: { equals: true },
      },
      sorts: [
        { property: "Priority", direction: "ascending" },
        { property: "Created time", direction: "descending" },
      ],
      page_size: 50,
    }),
  });

  const data = await res.json();

  const emails = (data.results || []).map((page: any) => {
    const props = page.properties;
    const priority = props?.Priority?.select?.name || "Low";
    const actionStatus = props?.["Action Status"]?.select?.name || "";
    const sourceType = props?.["Source Type"]?.select?.name || "Gmail";

    // Map to dashboard category
    let category = "FYI";
    if (priority === "High" || actionStatus === "urgent") category = "URGENT";
    else if (actionStatus === "requires-action" || actionStatus === "draft-ready") category = "ACTION NEEDED";
    else if (sourceType === "Slack") category = "ACTION NEEDED";

    return {
      id: page.id,
      sender: props?.["Sender Name"]?.rich_text?.[0]?.plain_text || props?.Source?.rich_text?.[0]?.plain_text || "Unknown",
      senderEmail: props?.["Sender Email"]?.email || "",
      subject: props?.Name?.title?.[0]?.plain_text || "Untitled",
      category,
      summary: props?.Summary?.rich_text?.[0]?.plain_text || "",
      suggestedReply: props?.["Draft Reply"]?.rich_text?.[0]?.plain_text || "",
      threadId: props?.["Gmail Thread ID"]?.rich_text?.[0]?.plain_text || null,
      sourceType,
      client: props?.Client?.select?.name || null,
      actionStatus,
      createdAt: page.created_time,
    };
  });

  // Sort: URGENT first, then ACTION NEEDED, then FYI
  const order = { "URGENT": 0, "ACTION NEEDED": 1, "FYI": 2 };
  emails.sort((a: any, b: any) => (order[a.category] ?? 3) - (order[b.category] ?? 3));

  return new Response(JSON.stringify({ emails }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
```

---

## 4. `resolve-comms-item` — POST to mark a Comms Log item resolved

> Previously called `resolve-email-flag` and was a stub (returned ok without touching Notion). Now actually updates the Comms Log item.

```typescript
// supabase/functions/resolve-comms-item/index.ts
// Marks a Comms Log item as resolved in Notion.
// Sets needs_attention = false and action_status = "resolved".

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NOTION_KEY = Deno.env.get("NOTION_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { itemId, resolution } = await req.json();
  // resolution: "resolved" | "dismissed" | "awaiting-reply" | "sent"

  if (!itemId) {
    return new Response(JSON.stringify({ ok: false, error: "itemId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const res = await fetch(`https://api.notion.com/v1/pages/${itemId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${NOTION_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        "Needs Attention": { checkbox: false },
        "Action Status": { select: { name: resolution || "resolved" } },
      },
    }),
  });

  const ok = res.ok;
  const body = ok ? { ok: true, itemId, resolution } : { ok: false, error: await res.text() };

  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
```

---

## 5. `mae-daily-log` — GET Mae's latest daily log

> Reads the "Mae Daily Log" Notion page so the dashboard can show Mae's sync summary inline. Returns the page's text blocks as ordered lines, plus the count of lines that look like flagged items (so the panel can badge them). Mae updates this one page in place every run, so the dashboard always shows the latest.

```typescript
// supabase/functions/mae-daily-log/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const NOTION_KEY = Deno.env.get("NOTION_API_KEY")!;
const PAGE_ID = Deno.env.get("NOTION_MAE_LOG_PAGE")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

// Pull the plain text out of any block type that carries rich_text.
function blockText(block: any): string {
  const t = block.type;
  const rich = block[t]?.rich_text;
  if (!Array.isArray(rich)) return "";
  return rich.map((r: any) => r.plain_text).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Page metadata (for last-updated timestamp).
  const pageRes = await fetch(`https://api.notion.com/v1/pages/${PAGE_ID}`, {
    headers: {
      Authorization: `Bearer ${NOTION_KEY}`,
      "Notion-Version": "2022-06-28",
    },
  });
  const page = await pageRes.json();

  // Page body blocks.
  const blockRes = await fetch(
    `https://api.notion.com/v1/blocks/${PAGE_ID}/children?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${NOTION_KEY}`,
        "Notion-Version": "2022-06-28",
      },
    }
  );
  const blockData = await blockRes.json();

  const lines = (blockData.results || [])
    .map((b: any) => ({
      type: b.type,
      text: blockText(b),
      // A line is "flagged" if it mentions attention / needs Gabby / a judgment call.
      flagged: /needs attention|needs gabby|your call|judgment call|flag|blocked|slipping/i.test(blockText(b)),
    }))
    .filter((l: any) => l.text.trim().length > 0);

  const flaggedCount = lines.filter((l: any) => l.flagged).length;

  return new Response(
    JSON.stringify({
      updatedAt: page.last_edited_time || null,
      flaggedCount,
      lines,
    }),
    { headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
});
```

> Before this works: create a Notion page titled exactly **Mae Daily Log**, share it with your Notion integration, copy its id into `NOTION_MAE_LOG_PAGE`. Mae's scheduled prompt already writes to this one page in place, so the dashboard always reflects her newest run.

---

## HOW TO WIRE INTO LOVABLE

The Lovable project (Gabreal Command Center) uses these Supabase function names internally. After refactoring (done 2026-06-03), the mapping is:

```
/functions/v1/amber-emails         → POST (no body)  — loads Needs Attention queue
/functions/v1/resolve-comms-item   → POST { itemId, resolution }  — handles all actions
/api/notion-tasks                  → GET    (unchanged, tasks section)
/api/update-notion-task            → POST   { taskId, status }  (unchanged)
```

**Resolution values:**
- Approve/Resolve → `resolution: "resolved"`
- Dismiss → `resolution: "dismissed"`
- Send reply via Gmail → `resolution: "awaiting-reply"`

**Previous contract (replaced):**
- `comms-log-proposals` — was the load endpoint (now: `amber-emails`)
- `dashboard-action` with `{ action, comms_log_id }` — was the action handler (now: `resolve-comms-item`)
- `notion-data` with `action: "action-required"` — was panel load (now: `amber-emails`)
- `notion-data` with `action: "mark-resolved"` — was panel approve (now: `resolve-comms-item`)

---

## COMMS LOG — NEW FIELDS NEEDED IN NOTION

For the dashboard to work correctly, add these properties to the Comms Log Notion database:

| Field | Type | Purpose |
|---|---|---|
| `Sender Name` | Text | Display name of sender (Amber fills this) |
| `Sender Email` | Email | Sender's email address (Amber fills this) |
| `Gmail Thread ID` | Text | For "Open in Gmail" deep link (Amber fills this) |
| `Draft Reply` | Text | Amber's suggested reply in Gabby's voice |
| `Action Status` | Select | `draft-ready` · `requires-action` · `awaiting-reply` · `resolved` · `dismissed` |
| `Source Type` | Select | `Gmail` · `Slack` · `Internal` (already exists, confirm) |

The existing fields (Name/Title, Summary, Category, Priority, Needs Attention, Client) stay unchanged.
