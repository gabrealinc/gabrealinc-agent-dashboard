import { Router, Request, Response } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";

const router = Router();

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
    case "relation":    return p.relation?.map((r: any) => r.id) ?? [];
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
  const dbId = (req.query.db as string) || process.env.NOTION_TASKS_DB_ID;
  if (!dbId) {
    return res.status(400).json({ error: "No database ID. Pass ?db=<id> or set NOTION_TASKS_DB_ID secret." });
  }
  try {
    const connectors = getConnectors();
    const data = await queryDb(connectors, dbId, {
      sorts: [{ property: "Due Date", direction: "ascending" }],
      filter: {
        property: "Status",
        select: { does_not_equal: "Archived" },
      },
    });

    const tasks = (data.results ?? []).map((page: any, i: number) => {
      const dueRaw = prop(page, "Due Date") || prop(page, "Date") || prop(page, "Due") || "";
      const due = dueRaw ? new Date(dueRaw) : null;
      const dateDisplay = due
        ? due.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "";
      return {
        id: i + 1,
        notionId: page.id,
        name: prop(page, "Name") || prop(page, "Task") || prop(page, "Title") || "(untitled)",
        date: dateDisplay,
        sortDate: dueRaw.slice(0, 10),
        status: prop(page, "Status") || "To Do",
        client: prop(page, "Client") || prop(page, "Project") || "",
        notes: prop(page, "Notes") || prop(page, "Description") || "",
        notionUrl: page.url,
      };
    });

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
  const dbId = (req.query.db as string) || process.env.NOTION_CLIENTS_DB_ID;
  if (!dbId) {
    return res.status(400).json({ error: "No database ID. Pass ?db=<id> or set NOTION_CLIENTS_DB_ID secret." });
  }
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
