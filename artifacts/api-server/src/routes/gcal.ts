import { Router, Request, Response } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";

const router = Router();

function getConnectors() {
  return new ReplitConnectors();
}

// ─── GET /api/gcal/events?days=7&timeMin=ISO&timeMax=ISO ─────────────────────
router.get("/events", async (req: Request, res: Response) => {
  const days = Math.min(parseInt(req.query.days as string) || 1, 60);
  const calendarId = (req.query.cal as string) || "primary";

  const now = new Date();
  const timeMin = (req.query.timeMin as string) || now.toISOString();
  const timeMax = (req.query.timeMax as string) || new Date(now.getTime() + days * 86400000).toISOString();

  try {
    const connectors = getConnectors();
    const result = await connectors.proxy(
      "google-calendar",
      `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=50`,
      { method: "GET" }
    );
    const data = await result.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    // GCal colorId → warm hex palette for the dashboard
    const COLOR_MAP: Record<string, string> = {
      "1": "#FFCDD2", "2": "#C8E6C9", "3": "#A5D6A7",
      "4": "#FFCDD2", "5": "#FFE0B2", "6": "#F8BBD9",
      "7": "#C8E6C9", "8": "#E8EAF6", "9": "#E1BEE7",
      "10": "#E0F7FA", "11": "#F3E5F5",
    };
    function extractTime(raw: string): string {
      const m = raw.match(/T(\d{2}):(\d{2})/);
      return m ? `${m[1]}:${m[2]}` : "00:00";
    }
    function extractDate(raw: string): string {
      return raw.slice(0, 10);
    }

    const events = (data.items ?? []).map((ev: any) => {
      const startRaw = ev.start?.dateTime ?? ev.start?.date ?? "";
      const endRaw   = ev.end?.dateTime   ?? ev.end?.date   ?? "";
      const isAllDay = !ev.start?.dateTime;

      const date      = extractDate(startRaw);
      const startTime = isAllDay ? "00:00" : extractTime(startRaw);
      const endTime   = isAllDay ? "23:59" : extractTime(endRaw);

      // timeDisplay for the home widget
      let timeDisplay = isAllDay ? "All day" : "";
      if (!isAllDay && startTime) {
        let [h, m] = startTime.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
        timeDisplay = `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
      }

      return {
        id: ev.id,
        title: ev.summary ?? "(no title)",
        date,
        startTime,
        endTime,
        start: startRaw,
        end: endRaw,
        timeDisplay,
        color: COLOR_MAP[ev.colorId ?? ""] ?? "#FFE0B2",
        location: ev.location ?? "",
        description: ev.description ?? "",
        meetingLink: ev.hangoutLink ?? ev.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video")?.uri ?? "",
        isAllDay,
      };
    });

    return res.json({ events });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gcal/calendars — list available calendars ──────────────────────
router.get("/calendars", async (req: Request, res: Response) => {
  try {
    const connectors = getConnectors();
    const result = await connectors.proxy("google-calendar", "/calendar/v3/users/me/calendarList", { method: "GET" });
    const data = await result.json();
    const calendars = (data.items ?? []).map((cal: any) => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary ?? false,
      backgroundColor: cal.backgroundColor,
    }));
    return res.json({ calendars });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
