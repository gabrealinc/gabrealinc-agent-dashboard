import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
export type CalEvent = {
  id: string;
  title: string;
  date: string;       // "YYYY-MM-DD"
  startTime: string;  // "HH:MM" 24h
  endTime: string;
  color: string;
  meetingLink?: string;
  location?: string;
  notes?: string;
  attendees?: string;
};

// ─── Seed data ────────────────────────────────────────────────────────────────
// Anchored to the week of Jun 9, 2026
const seed = (date: string, id: string, fields: Omit<CalEvent, "id" | "date">): CalEvent =>
  ({ id, date, ...fields });

const DEFAULT_EVENTS: CalEvent[] = [
  seed("2026-06-08", "e1", { title: "Morning Routine", startTime: "06:00", endTime: "07:30", color: "#C8E6C9", location: "Home" }),
  seed("2026-06-08", "e2", { title: "Luxx Brand Review", startTime: "11:00", endTime: "12:00", color: "#FFE0B2", meetingLink: "https://zoom.us/j/123456", attendees: "Marcus Reid", notes: "Review logo revisions" }),
  seed("2026-06-09", "e3", { title: "Morning Routine", startTime: "06:00", endTime: "07:30", color: "#C8E6C9", location: "Home" }),
  seed("2026-06-09", "e4", { title: "LACES Strategy Call", startTime: "10:00", endTime: "11:00", color: "#FFE0B2", meetingLink: "https://zoom.us/j/99887766", attendees: "Jeff Williams", notes: "Q3 Klaviyo flow planning" }),
  seed("2026-06-09", "e5", { title: "Ryan Lands", startTime: "14:30", endTime: "15:30", color: "#E1BEE7", attendees: "Ryan Lands", notes: "Introductory call" }),
  seed("2026-06-09", "e6", { title: "Luna Vita Check-in", startTime: "16:00", endTime: "16:30", color: "#FFCDD2", meetingLink: "https://meet.google.com/abc-defg-hij", attendees: "Kea Moran", notes: "Brand deck progress update" }),
  seed("2026-06-10", "e7", { title: "Morning Routine", startTime: "06:00", endTime: "07:30", color: "#C8E6C9" }),
  seed("2026-06-10", "e8", { title: "Content Planning", startTime: "09:00", endTime: "10:00", color: "#E8EAF6", notes: "Social calendar for LACES + Bluebell" }),
  seed("2026-06-10", "e9", { title: "Bluebell Content Review", startTime: "13:00", endTime: "14:00", color: "#FFCDD2", meetingLink: "https://zoom.us/j/55443322", attendees: "Sarah Chen" }),
  seed("2026-06-11", "e10", { title: "Morning Routine", startTime: "06:00", endTime: "07:30", color: "#C8E6C9" }),
  seed("2026-06-11", "e11", { title: "Lennard Legal Check", startTime: "08:00", endTime: "09:00", color: "#F3E5F5", notes: "Weekly compliance review" }),
  seed("2026-06-11", "e12", { title: "Issa Rae Campaign Kickoff", startTime: "11:00", endTime: "12:30", color: "#FFE0B2", meetingLink: "https://meet.google.com/xyz-uvw-rst", attendees: "Issa Rae, Campaign Team", notes: "New campaign brief" }),
  seed("2026-06-12", "e13", { title: "Morning Routine", startTime: "06:00", endTime: "07:30", color: "#C8E6C9" }),
  seed("2026-06-12", "e14", { title: "Substack Writing Block", startTime: "09:00", endTime: "11:00", color: "#E0F7FA", location: "Home Office", notes: "Finish 'Soft Power Issue'" }),
  seed("2026-06-12", "e15", { title: "Team Sync", startTime: "15:00", endTime: "15:30", color: "#E8EAF6", meetingLink: "https://zoom.us/j/11223344" }),
  seed("2026-06-13", "e16", { title: "Rest Day", startTime: "09:00", endTime: "10:00", color: "#F8BBD9", notes: "No calls, protect the day" }),
  seed("2026-06-14", "e17", { title: "Weekly Review + Planning", startTime: "10:00", endTime: "11:30", color: "#E8EAF6", location: "Home Office", notes: "Sage brief + week ahead" }),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function weekStart(d: Date) {
  const r = new Date(d);
  const day = r.getDay(); // 0=Sun
  r.setDate(r.getDate() - day + (day === 0 ? -6 : 1)); // Mon
  return r;
}
function monthDays(year: number, month: number) {
  const days: (Date | null)[] = [];
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7; // Mon-indexed
  for (let i = 0; i < startPad; i++) days.push(null);
  const total = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= total; i++) days.push(new Date(year, month, i));
  return days;
}
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const HOUR_START = 6;
const HOUR_END = 20;
const TOTAL_HOURS = HOUR_END - HOUR_START;

// ─── Event Edit Panel ─────────────────────────────────────────────────────────
function EditPanel({
  event, onSave, onDelete, onClose,
}: {
  event: CalEvent | null;
  onSave: (e: CalEvent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CalEvent>(
    event ?? {
      id: `e${Date.now()}`, title: "", date: isoDate(new Date()),
      startTime: "09:00", endTime: "10:00", color: "#FFE0B2",
    }
  );
  useEffect(() => {
    setForm(event ?? {
      id: `e${Date.now()}`, title: "", date: isoDate(new Date()),
      startTime: "09:00", endTime: "10:00", color: "#FFE0B2",
    });
  }, [event]);

  const set = (k: keyof CalEvent, v: string) => setForm(f => ({ ...f, [k]: v }));

  const COLOR_OPTIONS = [
    "#FFE0B2","#C8E6C9","#FFCDD2","#E1BEE7","#E0F7FA","#E8EAF6","#F3E5F5","#F8BBD9",
  ];

  return (
    <div className="cal-edit-panel">
      <div className="cal-edit-header">
        <span style={{ fontWeight: 600, fontSize: 14 }}>{event ? "Edit Event" : "New Event"}</span>
        <button className="cal-icon-btn" onClick={onClose}>✕</button>
      </div>
      <div className="cal-edit-body">
        <label className="cal-field-label">Title</label>
        <input className="cal-field-input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Event name" />

        <label className="cal-field-label">Date</label>
        <input className="cal-field-input" type="date" value={form.date} onChange={e => set("date", e.target.value)} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label className="cal-field-label">Start</label>
            <input className="cal-field-input" type="time" value={form.startTime} onChange={e => set("startTime", e.target.value)} />
          </div>
          <div>
            <label className="cal-field-label">End</label>
            <input className="cal-field-input" type="time" value={form.endTime} onChange={e => set("endTime", e.target.value)} />
          </div>
        </div>

        <label className="cal-field-label">Location</label>
        <input className="cal-field-input" value={form.location ?? ""} onChange={e => set("location", e.target.value)} placeholder="Add location..." />

        <label className="cal-field-label">Meeting Link</label>
        <input className="cal-field-input" value={form.meetingLink ?? ""} onChange={e => set("meetingLink", e.target.value)} placeholder="https://..." />

        <label className="cal-field-label">Attendees</label>
        <input className="cal-field-input" value={form.attendees ?? ""} onChange={e => set("attendees", e.target.value)} placeholder="Names or emails..." />

        <label className="cal-field-label">Notes</label>
        <textarea className="cal-field-textarea" value={form.notes ?? ""} onChange={e => set("notes", e.target.value)} placeholder="Add notes..." />

        <label className="cal-field-label">Color</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {COLOR_OPTIONS.map(c => (
            <button
              key={c}
              onClick={() => set("color", c)}
              style={{
                width: 24, height: 24, borderRadius: "50%", background: c, border: `2px solid ${form.color === c ? "var(--accent)" : "transparent"}`,
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      </div>
      <div className="cal-edit-footer">
        <button className="btn btn-accent" onClick={() => onSave(form)} style={{ flex: 1 }}>Save</button>
        {event && (
          <button className="btn btn-dismiss" onClick={() => onDelete(form.id)} style={{ flex: 1 }}>Delete</button>
        )}
      </div>
    </div>
  );
}

// ─── Event Pill (week grid) ───────────────────────────────────────────────────
function EventPill({ ev, onEdit }: { ev: CalEvent; onEdit: (e: CalEvent) => void }) {
  const start = toMinutes(ev.startTime) - HOUR_START * 60;
  const duration = toMinutes(ev.endTime) - toMinutes(ev.startTime);
  const topPct = (start / (TOTAL_HOURS * 60)) * 100;
  const heightPct = Math.max((duration / (TOTAL_HOURS * 60)) * 100, 2);

  return (
    <div
      className="cal-event-pill"
      style={{ top: `${topPct}%`, height: `${heightPct}%`, background: ev.color }}
      onClick={e => { e.stopPropagation(); onEdit(ev); }}
    >
      <div className="cal-event-title">{ev.title}</div>
      <div className="cal-event-time">{fmt12(ev.startTime)}</div>
      {ev.meetingLink && (
        <a
          href={ev.meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="cal-join-btn"
          onClick={e => e.stopPropagation()}
        >
          Join ↗
        </a>
      )}
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({
  weekOf, events, onEdit, onNewAt,
}: {
  weekOf: Date;
  events: CalEvent[];
  onEdit: (e: CalEvent) => void;
  onNewAt: (date: string, hour: number) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekOf, i));
  const today = isoDate(new Date());
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);

  return (
    <div className="cal-week-outer">
      {/* Day headers */}
      <div className="cal-week-header">
        <div className="cal-time-gutter" />
        {days.map((d, i) => {
          const iso = isoDate(d);
          const isToday = iso === today;
          return (
            <div key={i} className={`cal-day-header ${isToday ? "cal-today-header" : ""}`}>
              <span className="cal-day-name">{DAY_NAMES[i]}</span>
              <span className={`cal-day-num ${isToday ? "cal-today-num" : ""}`}>
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div className="cal-week-grid-scroll">
        <div className="cal-week-grid">
          {/* Hour labels */}
          <div className="cal-time-gutter">
            {hours.map(h => (
              <div key={h} className="cal-hour-label">
                {h % 12 === 0 ? "12" : h % 12}{h < 12 ? " AM" : " PM"}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, di) => {
            const iso = isoDate(d);
            const dayEvs = events.filter(e => e.date === iso);
            return (
              <div key={di} className={`cal-day-col ${isoDate(d) === today ? "cal-today-col" : ""}`}>
                {hours.map(h => (
                  <div
                    key={h}
                    className="cal-hour-cell"
                    onClick={() => onNewAt(iso, h)}
                  />
                ))}
                {dayEvs.map(ev => <EventPill key={ev.id} ev={ev} onEdit={onEdit} />)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────
function MonthView({
  year, month, events, onEdit, onNewAt,
}: {
  year: number;
  month: number;
  events: CalEvent[];
  onEdit: (e: CalEvent) => void;
  onNewAt: (date: string, hour: number) => void;
}) {
  const days = monthDays(year, month);
  const today = isoDate(new Date());

  return (
    <div className="cal-month-grid">
      {DAY_NAMES.map(d => (
        <div key={d} className="cal-month-day-name">{d}</div>
      ))}
      {days.map((d, i) => {
        if (!d) return <div key={`pad-${i}`} className="cal-month-cell cal-month-pad" />;
        const iso = isoDate(d);
        const dayEvs = events.filter(e => e.date === iso);
        const isToday = iso === today;
        return (
          <div
            key={iso}
            className={`cal-month-cell ${isToday ? "cal-month-today" : ""}`}
            onClick={() => onNewAt(iso, 9)}
          >
            <span className={`cal-month-num ${isToday ? "cal-month-num-today" : ""}`}>
              {d.getDate()}
            </span>
            <div className="cal-month-events">
              {dayEvs.slice(0, 3).map(ev => (
                <div
                  key={ev.id}
                  className="cal-month-event"
                  style={{ background: ev.color }}
                  onClick={e => { e.stopPropagation(); onEdit(ev); }}
                >
                  {fmt12(ev.startTime).replace(" AM","a").replace(" PM","p")} {ev.title}
                </div>
              ))}
              {dayEvs.length > 3 && (
                <div className="cal-month-more">+{dayEvs.length - 3} more</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main CalendarModal ───────────────────────────────────────────────────────
export default function CalendarModal({ onClose }: { onClose: () => void }) {
  const [calView, setCalView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>(DEFAULT_EVENTS);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null | "new">(null);
  const [newEventDefaults, setNewEventDefaults] = useState<Partial<CalEvent>>({});
  const overlayRef = useRef<HTMLDivElement>(null);

  // Fetch GCal events for the visible date range
  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        let timeMin: Date;
        let timeMax: Date;

        if (calView === "week") {
          timeMin = weekStart(cursor);
          timeMax = addDays(timeMin, 7);
        } else {
          // Full month: first day of month → first day of next month
          timeMin = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
          timeMax = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        }

        const params = new URLSearchParams({
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
        });

        const res = await fetch(`/api/gcal/events?${params}`, { credentials: "include" });
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (data.events?.length) {
          // Merge live events with any local edits (keep local additions/edits)
          setEvents(data.events as CalEvent[]);
        }
      } catch {
        // keep seed data if API fails
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  // Re-fetch whenever the view type or the visible date range changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calView, cursor.toISOString().slice(0, 7)]);

  // Close on overlay click
  function handleOverlay(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  // Keyboard esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const weekOf = weekStart(cursor);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  function prevPeriod() {
    setCursor(c => calView === "week" ? addDays(c, -7) : new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }
  function nextPeriod() {
    setCursor(c => calView === "week" ? addDays(c, 7) : new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }
  function goToday() { setCursor(new Date()); }

  function handleNewAt(date: string, hour: number) {
    const hStr = hour.toString().padStart(2, "0");
    setNewEventDefaults({ date, startTime: `${hStr}:00`, endTime: `${(hour + 1).toString().padStart(2, "0")}:00` });
    setEditing("new");
  }

  function handleSave(ev: CalEvent) {
    setEvents(prev => {
      const exists = prev.find(e => e.id === ev.id);
      return exists ? prev.map(e => e.id === ev.id ? ev : e) : [...prev, ev];
    });
    setEditing(null);
  }

  function handleDelete(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id));
    setEditing(null);
  }

  const periodLabel = calView === "week"
    ? (() => {
        const ws = weekStart(cursor);
        const we = addDays(ws, 6);
        if (ws.getMonth() === we.getMonth())
          return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`;
        return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()} – ${MONTH_NAMES[we.getMonth()]} ${we.getDate()}, ${ws.getFullYear()}`;
      })()
    : `${MONTH_NAMES[month]} ${year}`;

  const editingEvent = editing === "new"
    ? ({ id: `e${Date.now()}`, title: "", color: "#FFE0B2", startTime: "09:00", endTime: "10:00", date: isoDate(new Date()), ...newEventDefaults } as CalEvent)
    : editing;

  return (
    <div className="cal-overlay" ref={overlayRef} onClick={handleOverlay}>
      <div className="cal-modal">
        {/* Header */}
        <div className="cal-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 500 }}>Calendar</span>
            <button className="cal-today-btn" onClick={goToday}>Today</button>
            <button className="cal-nav-btn" onClick={prevPeriod}>‹</button>
            <button className="cal-nav-btn" onClick={nextPeriod}>›</button>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", minWidth: 220 }}>{periodLabel}</span>
            {loading && <span style={{ fontSize: 11, color: "var(--text-xsoft)", fontFamily: "Inter, sans-serif" }}>syncing…</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="cal-view-toggle">
              <button className={`cal-view-btn ${calView === "week" ? "active" : ""}`} onClick={() => setCalView("week")}>Week</button>
              <button className={`cal-view-btn ${calView === "month" ? "active" : ""}`} onClick={() => setCalView("month")}>Month</button>
            </div>
            <button className="btn btn-accent" style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => { setNewEventDefaults({}); setEditing("new"); }}>
              + New Event
            </button>
            <button className="cal-icon-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="cal-modal-body">
          <div className={`cal-content ${editing ? "cal-content-split" : ""}`}>
            {calView === "week" ? (
              <WeekView weekOf={weekOf} events={events} onEdit={setEditing} onNewAt={handleNewAt} />
            ) : (
              <MonthView year={year} month={month} events={events} onEdit={setEditing} onNewAt={handleNewAt} />
            )}
          </div>
          {editing && (
            <EditPanel
              event={editingEvent === null ? null : editingEvent as CalEvent}
              onSave={handleSave}
              onDelete={handleDelete}
              onClose={() => setEditing(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
