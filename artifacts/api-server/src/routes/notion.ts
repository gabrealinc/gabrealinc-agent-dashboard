import { Router, Request, Response } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";

const router = Router();

// Known Notion DB IDs (non-sensitive identifiers, safe to hardcode as fallbacks)
const DEFAULT_TASKS_DB   = process.env.NOTION_TASKS_DB_ID   ?? "222a4fa7-7eaf-812b-8707-d4f1da02d778";
const DEFAULT_CLIENTS_DB = process.env.NOTION_CLIENTS_DB_ID ?? "d3da4fa7-7eaf-82df-b0d8-014512d331ec";

function getConnectors() {
  return new ReplitConnectors();
}

// ─── Helper: query a Notion database ─────────────────────────────────────────
async function queryDb(connectors: ReplitConnectors, databaseId: string, body: object = {}) {
  const res = await connectors.proxy("notion", `/v1/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return res.json();
}

// ─── Helper: extract a property value from a Notion page ─────────────────────
function prop(page: any, key: string) {
  const p = page.properties?.[key];
  if (!p) return "";
  switch (p.type) {
    case "title":       return p.title?.map((t: any) => t.plain_text).join("") ?? "";
    case "rich_text":   return p.rich_text?.map((t: any) => t.plain_text).join("") ?? "";
    case "select":      return p.select?.name ?? "";
    case "multi_select":return p.multi_select?.map((s: any) => s.name).join(", ") ?? "";
    case "date":        return p.date?.start ?? "";
    case "number":      return p.number ?? 0;
    case "checkbox":    return p.checkbox ?? false;
    case "url":         return p.url ?? "";
    case "email":       return p.email ?? "";
    case "phone_number":return p.phone_number ?? "";
    case "formula":     return p.formula?.string ?? p.formula?.number ?? p.formula?.boolean ?? "";
    case "relation":    return "";   // relations return IDs only; use a rollup or text field instead
    case "rollup":      return p.rollup?.array
                          ?.flatMap((item: any) => {
                            if (item.type === "title")     return item.title?.map((t: any) => t.plain_text) ?? [];
                            if (item.type === "rich_text") return item.rich_text?.map((t: any) => t.plain_text) ?? [];
                            if (item.type === "select")    return item.select?.name ? [item.select.name] : [];
                            return [];
                          }).join(", ") ?? "";
    case "people":      return p.people?.map((u: any) => u.name).join(", ") ?? "";
    default:            return "";
  }
}

// ─── GET /api/notion/databases — list all databases the integration can see ──
router.get("/databases", async (req: Request, res: Response) => {
  try {
    const connectors = getConnectors();
    const result = await connectors.proxy("notion", "/v1/search", {
      method: "POST",
      body: JSON.stringify({ filter: { value: "database", property: "object" } }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await result.json();
    const dbs = (data.results ?? []).map((db: any) => ({
      id: db.id,
      title: db.title?.map((t: any) => t.plain_text).join("") ?? "(untitled)",
      url: db.url,
    }));
    return res.json({ databases: dbs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/notion/tasks?db=<database_id> ──────────────────────────────────
router.get("/tasks", async (req: Request, res: Response) => {
  const dbId = (req.query.db as string) || DEFAULT_TASKS_DB;
  try {
    const connectors = getConnectors();
    const data = await queryDb(connectors, dbId, {
      sorts: [{ property: "Due Date", direction: "ascending" }],
    });

    const tasks = (data.results ?? []).map((page: any, i: number) => {
      const dueRaw = prop(page, "Due Date") || prop(page, "Start Date") || prop(page, "Date") || prop(page, "Due") || "";
      const due = dueRaw ? new Date(dueRaw) : null;
      const dateDisplay = due
        ? due.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "";
      const status = prop(page, "Status") || "To Do";
      // Skip archived/done items older than 7 days
      if (status === "Archived") return null;
      return {
        id: i + 1,
        notionId: page.id,
        name: prop(page, "Task") || prop(page, "Name") || prop(page, "Title") || "(untitled)",
        date: dateDisplay,
        sortDate: (dueRaw || "9999-12-31").slice(0, 10),
        status,
        client: prop(page, "Client Name") || prop(page, "Client") || prop(page, "Project Name") || prop(page, "Project") || prop(page, "Account") || prop(page, "Company") || "",
        notes: prop(page, "Notes") || prop(page, "Description") || "",
        notionUrl: page.url,
      };
    }).filter(Boolean);

    return res.json({ tasks });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/notion/tasks/:id — update a task's status ───────────────────
router.patch("/tasks/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body ?? {};
  if (!status) return res.status(400).json({ error: "Missing status in body" });
  try {
    const connectors = getConnectors();
    const result = await connectors.proxy("notion", `/v1/pages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: { Status: { select: { name: status } } } }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await result.json();
    return res.json({ ok: true, page: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/notion/clients?db=<database_id> ────────────────────────────────
router.get("/clients", async (req: Request, res: Response) => {
  const dbId = (req.query.db as string) || DEFAULT_CLIENTS_DB;
  try {
    const connectors = getConnectors();
    const data = await queryDb(connectors, dbId, {
      sorts: [{ property: "Name", direction: "ascending" }],
    });

    const clients = (data.results ?? []).map((page: any) => ({
      notionId: page.id,
      name: prop(page, "Name") || prop(page, "Client") || "(untitled)",
      contact: prop(page, "Contact") || prop(page, "Point of Contact") || "",
      email: prop(page, "Email") || "",
      phone: prop(page, "Phone") || "",
      type: prop(page, "Services") || prop(page, "Type") || prop(page, "Package") || "",
      status: prop(page, "Status") || "Active",
      value: prop(page, "Value") || prop(page, "Monthly Value") || prop(page, "Contract Value") || 0,
      valueLabel: prop(page, "Billing Type") || prop(page, "Contract Type") || "monthly",
      nextMeeting: prop(page, "Next Meeting") || prop(page, "Next Call") || "—",
      lastActivity: prop(page, "Last Activity") || prop(page, "Last Updated") || "",
      tags: (prop(page, "Tags") || prop(page, "Services") || "")
        .split(",").map((s: string) => s.trim()).filter(Boolean),
      notionUrl: page.url,
    }));

    return res.json({ clients });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/notion/comms?db=<database_id> ──────────────────────────────────
// Auto-discovers "Comms Log" database by name if NOTION_COMMS_DB_ID not set.
function commsRelativeTime(dateStr: string): string {
  const date = dateStr ? new Date(dateStr) : new Date();
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}hr ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

router.get("/comms", async (req: Request, res: Response) => {
  try {
    const connectors = getConnectors();

    let dbId = (req.query.db as string) || process.env.NOTION_COMMS_DB_ID;

    // Auto-discover by searching for "Comms" database title
    if (!dbId) {
      const searchRes = await connectors.proxy("notion", "/v1/search", {
        method: "POST",
        body: JSON.stringify({ query: "Comms", filter: { value: "database", property: "object" } }),
        headers: { "Content-Type": "application/json" },
      });
      const searchData = await searchRes.json();
      const found = (searchData.results ?? []).find((db: any) => {
        const title = (db.title ?? []).map((t: any) => t.plain_text).join("").toLowerCase();
        return title.includes("comms");
      });
      dbId = found?.id;
    }

    if (!dbId) {
      return res.status(404).json({ error: "Comms Log database not found. Set NOTION_COMMS_DB_ID env var or name the database with 'Comms' in the title." });
    }

    const data = await queryDb(connectors, dbId, {
      filter: {
        or: [
          { property: "Status", select: { does_not_equal: "Done" } },
          { property: "Status", select: { does_not_equal: "Archived" } },
          { property: "Status", select: { does_not_equal: "Dismissed" } },
        ],
      },
      sorts: [{ timestamp: "created_time", direction: "descending" }],
      page_size: 20,
    });

    const items = (data.results ?? []).map((page: any) => {
      const status = prop(page, "Status");
      if (["Done", "Archived", "Dismissed"].includes(status)) return null;

      const dateRaw =
        prop(page, "Date") || prop(page, "Created Date") || page.created_time || "";

      const priority =
        prop(page, "Priority") || prop(page, "Urgency") || prop(page, "Type") || "";

      return {
        id: page.id,
        notionUrl: page.url,
        summary:
          prop(page, "Name") || prop(page, "Subject") || prop(page, "Summary") ||
          prop(page, "Title") || "(untitled)",
        priority: priority.toUpperCase(),
        source:
          prop(page, "Source") || prop(page, "Channel") || prop(page, "Platform") || "",
        client:
          prop(page, "Client") || prop(page, "Contact") || prop(page, "From") ||
          prop(page, "Person") || "",
        status,
        context:
          prop(page, "Context") || prop(page, "Why") || prop(page, "Notes") ||
          prop(page, "Description") || prop(page, "Details") || "",
        draftReply:
          prop(page, "Draft Reply") || prop(page, "Draft") || prop(page, "Reply") || "",
        action:
          prop(page, "Action") || prop(page, "Action Type") || prop(page, "Next Step") || "",
        relativeTime: commsRelativeTime(dateRaw),
      };
    }).filter(Boolean);

    return res.json({ items, dbId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/notion/comms/:id/dismiss — mark a comms item Done ──────────────
router.post("/comms/:id/dismiss", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const connectors = getConnectors();
    await connectors.proxy("notion", `/v1/pages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: { Status: { select: { name: "Done" } } } }),
      headers: { "Content-Type": "application/json" },
    });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/notion/clients — create a new client page ─────────────────────
router.post("/clients", async (req: Request, res: Response) => {
  const dbId = (req.body?.db as string) || process.env.NOTION_CLIENTS_DB_ID;
  if (!dbId) return res.status(400).json({ error: "Missing database ID." });
  const { name, contact, email, phone, type, notes, value } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "Missing name" });

  try {
    const connectors = getConnectors();
    const result = await connectors.proxy("notion", "/v1/pages", {
      method: "POST",
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: {
          Name: { title: [{ text: { content: name } }] },
          ...(contact ? { Contact: { rich_text: [{ text: { content: contact } }] } } : {}),
          ...(email   ? { Email: { email } } : {}),
          ...(phone   ? { Phone: { phone_number: phone } } : {}),
          ...(type    ? { Services: { multi_select: type.split(",").map((t: string) => ({ name: t.trim() })) } } : {}),
          ...(notes   ? { Notes: { rich_text: [{ text: { content: notes } }] } } : {}),
          ...(value   ? { Value: { number: Number(value) } } : {}),
          Status: { select: { name: "Active" } },
        },
      }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await result.json();
    return res.status(201).json({ ok: true, page: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
