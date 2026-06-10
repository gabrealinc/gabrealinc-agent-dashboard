import { Router, Request, Response } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";

const router = Router();

function getConnectors() {
  return new ReplitConnectors();
}

// ─── GET /api/gcal/events?days=7 — fetch upcoming events ─────────────────────
router.get("/events", async (req: Request, res: Response) => {
  const days = Math.min(parseInt(req.query.days as string) || 1, 30);
  const calendarId = (req.query.cal as string) || "primary";

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + days * 86400000).toISOString();

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

    const events = (data.items ?? []).map((ev: any) => {
      const start = ev.start?.dateTime ?? ev.start?.date ?? "";
      const end   = ev.end?.dateTime   ?? ev.end?.date   ?? "";
      const d = start ? new Date(start) : null;
      // ISO strings like "2026-06-10T06:00:00-07:00" carry their own offset —
      // extract the local time directly from the string instead of using Date (which converts to server UTC)
      let timeDisplay = "";
      if (ev.start?.dateTime) {
        const raw: string = ev.start.dateTime;
        // Try to parse HH:MM from the local portion of the ISO string
        const localMatch = raw.match(/T(\d{2}):(\d{2})/);
        if (localMatch) {
          let h = parseInt(localMatch[1], 10);
          const m = localMatch[2];
          const ampm = h >= 12 ? "PM" : "AM";
          if (h > 12) h -= 12;
          if (h === 0) h = 12;
          timeDisplay = `${h}:${m} ${ampm}`;
        }
      } else if (ev.start?.date) {
        timeDisplay = "All day";
      }
      return {
        id: ev.id,
        title: ev.summary ?? "(no title)",
        start,
        end,
        timeDisplay,
        location: ev.location ?? "",
        description: ev.description ?? "",
        hangoutLink: ev.hangoutLink ?? "",
        colorId: ev.colorId ?? "",
        isAllDay: !ev.start?.dateTime,
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
