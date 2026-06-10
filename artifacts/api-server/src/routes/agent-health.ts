import { Router, Request, Response } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";

const router = Router();

const ROSTER_DB_ID = "375a4fa7-7eaf-809d-9ca7-000b5e5eccd8";

// 5-minute server-side cache
let healthCache: { data: AgentHealth[]; checkedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Cadence windows in minutes (1x = green threshold, 2x = red threshold)
const CADENCE_MINUTES: Record<string, number> = {
  Hourly: 60,
  Daily: 24 * 60,
  Weekdays: 24 * 60,
  Weekly: 7 * 24 * 60,
  "Per-cycle": 7 * 24 * 60,
};

export type HealthStatus = "green" | "yellow" | "red" | "gray";

export interface AgentHealth {
  name: string;
  role: string;
  rosterStatus: string;
  healthStatus: HealthStatus;
  lastReportAt: string | null;
  lastReportTitle: string | null;
  lastReportUrl: string | null;
  cadence: string;
  overdueBy: string | null;
  expectedTime: string | null;
}

function prop(page: any, ...keys: string[]): string {
  for (const k of keys) {
    const p = page.properties?.[k];
    if (!p) continue;
    if (p.type === "title")           return (p.title ?? []).map((t: any) => t.plain_text).join("");
    if (p.type === "rich_text")       return (p.rich_text ?? []).map((t: any) => t.plain_text).join("");
    if (p.type === "select")          return p.select?.name ?? "";
    if (p.type === "date")            return p.date?.start ?? "";
    if (p.type === "created_time")    return p.created_time ?? "";
    if (p.type === "last_edited_time")return p.last_edited_time ?? "";
    if (p.type === "url")             return p.url ?? "";
    if (p.type === "number")          return String(p.number ?? "");
    if (p.type === "checkbox")        return p.checkbox ? "true" : "";
  }
  return "";
}

function minutesToHuman(mins: number): string {
  if (mins < 60)         return `${Math.round(mins)}m`;
  if (mins < 24 * 60)   return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / (24 * 60))}d`;
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function computeHealth(
  rosterStatus: string,
  cadence: string,
  lastReportAt: Date | null,
): { healthStatus: HealthStatus; overdueBy: string | null } {
  if (rosterStatus === "Paused" || rosterStatus === "Building") {
    return { healthStatus: "gray", overdueBy: null };
  }

  if (!lastReportAt) {
    return { healthStatus: "red", overdueBy: "no report found" };
  }

  const windowMins = CADENCE_MINUTES[cadence] ?? CADENCE_MINUTES.Daily;
  const now = new Date();

  // Weekdays cadence: never go red on weekends
  if (cadence === "Weekdays" && isWeekend(now)) {
    return { healthStatus: "green", overdueBy: null };
  }

  const elapsedMins = (now.getTime() - lastReportAt.getTime()) / 60_000;

  if (elapsedMins <= windowMins) {
    return { healthStatus: "green", overdueBy: null };
  }
  if (elapsedMins <= 2 * windowMins) {
    return { healthStatus: "yellow", overdueBy: `${minutesToHuman(elapsedMins - windowMins)} overdue` };
  }
  return { healthStatus: "red", overdueBy: `${minutesToHuman(elapsedMins - windowMins)} overdue` };
}

const HEALTH_ORDER: Record<HealthStatus, number> = { red: 0, yellow: 1, green: 2, gray: 3 };

router.get("/agent-health", async (_req: Request, res: Response) => {
  // Serve from cache if fresh
  if (healthCache && Date.now() - healthCache.checkedAt < CACHE_TTL_MS) {
    return res.json({
      agents: healthCache.data,
      checkedAt: new Date(healthCache.checkedAt).toISOString(),
      cached: true,
    });
  }

  try {
    const connectors = new ReplitConnectors();

    // 1. Fetch the Agent Roster
    const rosterRes = await connectors.proxy("notion", `/v1/databases/${ROSTER_DB_ID}/query`, {
      method: "POST",
      body: JSON.stringify({ page_size: 50 }),
      headers: { "Content-Type": "application/json" },
    });
    const rosterData = await rosterRes.json();

    if (rosterData.object === "error") {
      return res.status(502).json({ error: "notion_error", message: rosterData.message });
    }

    // 2. For each agent, fetch their latest report in parallel
    const agents: AgentHealth[] = await Promise.all(
      (rosterData.results ?? []).map(async (page: any): Promise<AgentHealth> => {
        const name         = prop(page, "Name", "Agent Name", "Agent");
        const role         = prop(page, "Role", "Description", "Function");
        const rosterStatus = prop(page, "Status") || "Active";
        const reportsDbId  = prop(page, "Reports DB ID", "Reports Database", "Reports DB");
        const cadence      = prop(page, "Cadence") || "Daily";
        const expectedTime = prop(page, "Expected Time") || null;

        let lastReportAt: Date | null = null;
        let lastReportTitle: string | null = null;
        let lastReportUrl: string | null = null;

        if (rosterStatus === "Active" && reportsDbId) {
          try {
            const cleanId = reportsDbId.replace(/-/g, "");
            const reportsRes = await connectors.proxy(
              "notion",
              `/v1/databases/${cleanId}/query`,
              {
                method: "POST",
                body: JSON.stringify({
                  page_size: 1,
                  sorts: [
                    { property: "Date",      direction: "descending" },
                    { property: "Run Date",  direction: "descending" },
                    { timestamp: "created_time", direction: "descending" },
                  ],
                }),
                headers: { "Content-Type": "application/json" },
              },
            );
            const reportsData = await reportsRes.json();
            const latest = reportsData.results?.[0];
            if (latest) {
              const dateStr =
                prop(latest, "Date", "Run Date", "Report Date", "Created", "Timestamp") ||
                latest.created_time;
              lastReportAt    = dateStr ? new Date(dateStr) : null;
              lastReportTitle = prop(latest, "Name", "Title", "Summary", "Report") || "(untitled)";
              lastReportUrl   = latest.url ?? null;
            }
          } catch {
            // Reports DB query failed — leave lastReportAt null, will show as red
          }
        }

        const { healthStatus, overdueBy } = computeHealth(rosterStatus, cadence, lastReportAt);

        return {
          name,
          role,
          rosterStatus,
          healthStatus,
          lastReportAt:    lastReportAt?.toISOString() ?? null,
          lastReportTitle,
          lastReportUrl,
          cadence,
          overdueBy,
          expectedTime:    expectedTime || null,
        };
      }),
    );

    agents.sort((a, b) => HEALTH_ORDER[a.healthStatus] - HEALTH_ORDER[b.healthStatus]);

    const checkedAt = Date.now();
    healthCache = { data: agents, checkedAt };

    return res.json({ agents, checkedAt: new Date(checkedAt).toISOString(), cached: false });
  } catch (err: any) {
    return res.status(502).json({ error: "notion_unreachable", message: err.message });
  }
});

export default router;
