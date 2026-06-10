import { useState, useRef, useEffect, useCallback } from "react";
import CalendarModal from "@/components/CalendarModal";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function formatTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function weekStart(d: Date) { const r = new Date(d); const day = r.getDay(); r.setDate(r.getDate() - day + (day === 0 ? -6 : 1)); return r; }

// ─── Types ────────────────────────────────────────────────────────────────────
type View = "home" | "clients" | "finance" | "intelligence" | "substack" | "spirit" | "agents";

// ─── Static mock fallback data ────────────────────────────────────────────────
const SCHEDULE_MOCK = [
  { time: "6:00 AM", event: "Morning Routine" },
  { time: "10:00 AM", event: "LACES Strategy Call" },
  { time: "2:30 PM", event: "Ryan Lands" },
  { time: "4:00 PM", event: "Luna Vita Check-in" },
];

type Task = {
  id: number;
  notionId: string;
  name: string;
  date: string;       // display string e.g. "Jun 4"
  sortDate: string;   // ISO "2026-06-04" for sorting
  status: string;
  client: string;
  notes: string;
};

const STATUS_CYCLE: Record<string, string> = {
  "To Do": "In Progress",
  "In Progress": "Done",
  "Done": "To Do",
};

const TASKS_SEED: Task[] = [
  { id: 1, notionId: "task-001", name: "Add Favicon to Luxx Site", date: "Jun 4", sortDate: "2026-06-04", status: "To Do", client: "Luxx", notes: "Use the square version of the new logo — export at 32×32 and 180×180." },
  { id: 2, notionId: "task-002", name: "Send Issa Dashboard", date: "Jun 4", sortDate: "2026-06-04", status: "To Do", client: "Issa Rae Media", notes: "Send the campaign analytics PDF and Notion dashboard link." },
  { id: 3, notionId: "task-003", name: "Luna Vita Brand Deck", date: "Jun 4", sortDate: "2026-06-04", status: "In Progress", client: "Luna Vita", notes: "First full draft due Friday EOD. Kea is waiting — she asked about timeline this morning." },
  { id: 4, notionId: "task-004", name: "LACES Klaviyo Flow", date: "Jun 6", sortDate: "2026-06-06", status: "In Progress", client: "LACES", notes: "Send updated proposal to Jeff by Thursday. Cover the welcome series + win-back flow." },
  { id: 5, notionId: "task-005", name: "Create Labels for All Products", date: "Jun 11", sortDate: "2026-06-11", status: "To Do", client: "Luna Vita", notes: "Print-ready files needed — 3×2 in, CMYK, 300dpi. Check with Kea on label copy." },
];

const INVOICES = [
  { client: "Luna Vita", project: "Brand Identity", amount: "$4,800", date: "May 28", status: "Paid" },
  { client: "LACES", project: "Klaviyo Strategy", amount: "$5,000", date: "Jun 1", status: "Pending" },
  { client: "Luxx", project: "Website", amount: "$3,200", date: "Jun 5", status: "Pending" },
  { client: "Issa Rae Media", project: "Campaign Design", amount: "$2,400", date: "May 15", status: "Paid" },
  { client: "Bluebell", project: "Social Content", amount: "$1,800", date: "May 10", status: "Overdue" },
];

const REVENUE_DATA = [
  { month: "Jan", val: 9200 },
  { month: "Feb", val: 11400 },
  { month: "Mar", val: 8600 },
  { month: "Apr", val: 14200 },
  { month: "May", val: 17200 },
  { month: "Jun", val: 12400 },
];

// ─── Personal Finance / Investments ──────────────────────────────────────────
const INVESTMENT_ACCOUNTS = [
  { name: "Fidelity Brokerage", type: "Taxable", value: 42350, change: 12.4, icon: "📈" },
  { name: "Roth IRA", type: "Retirement", value: 28900, change: 8.2, icon: "🏦" },
  { name: "SEP-IRA", type: "Business Retirement", value: 15200, change: 6.1, icon: "💼" },
  { name: "Coinbase", type: "Crypto", value: 8450, change: -3.2, icon: "₿" },
];

const HOLDINGS = [
  { ticker: "VTI",  name: "Vanguard Total Market",  shares: "40",    price: "$240.20", value: 9608,  gain: 1280,  pct: 15.3  },
  { ticker: "QQQ",  name: "Invesco NASDAQ-100",      shares: "15",    price: "$450.10", value: 6752,  gain: 890,   pct: 13.2  },
  { ticker: "AAPL", name: "Apple Inc.",              shares: "20",    price: "$185.50", value: 3710,  gain: 420,   pct: 12.8  },
  { ticker: "AMZN", name: "Amazon.com",              shares: "8",     price: "$182.00", value: 1456,  gain: 180,   pct: 14.1  },
  { ticker: "BTC",  name: "Bitcoin",                 shares: "0.15",  price: "$68,400", value: 10260, gain: -840,  pct: -7.6  },
  { ticker: "ETH",  name: "Ethereum",                shares: "2.5",   price: "$3,520",  value: 8800,  gain: 240,   pct: 2.8   },
  { ticker: "VNQ",  name: "Vanguard Real Estate ETF",shares: "25",    price: "$80.20",  value: 2005,  gain: -120,  pct: -2.3  },
];

const ALLOCATION = [
  { label: "US Stocks", pct: 48, color: "#E8A040" },
  { label: "ETFs",      pct: 20, color: "#C0803A" },
  { label: "Crypto",    pct: 16, color: "#9060C0" },
  { label: "Real Estate", pct: 8, color: "#60A878" },
  { label: "Cash",      pct: 8,  color: "#B0A090" },
];

const INTEL_ITEMS = [
  {
    section: "AI & AUTOMATION",
    items: [
      { source: "TechCrunch", headline: "Claude 3.5 expands tool use for agentic workflows", summary: "Anthropic's latest release adds persistent memory and multi-step task execution, directly relevant to your agent stack.", date: "Jun 8" },
      { source: "OpenAI Blog", headline: "GPT-4o mini drops API pricing 60%", summary: "Significant cost reduction for AI-powered workflows. Your Sage and Amber agents could run 3× cheaper per month.", date: "Jun 7" },
    ],
  },
  {
    section: "INDUSTRY & COMPETITORS",
    items: [
      { source: "Fast Company", headline: "Brand studios raising rates 20% citing AI tooling overhead", summary: "Competitors are using AI as justification to raise rates. Opportunity to position Gab Real Inc as premium + efficient.", date: "Jun 6" },
      { source: "Adweek", headline: "Email marketing outperforms social in Q2 2025 conversions", summary: "Klaviyo-driven email shows 4.2× ROI vs paid social. Reinforces your strategy for LACES and Luna Vita.", date: "Jun 5" },
    ],
  },
  {
    section: "OPPORTUNITY RADAR",
    items: [
      { source: "LinkedIn", headline: "Lululemon seeking agency for brand refresh campaign", summary: "Posted 2 days ago. Budget range $80K–$120K. Matches your wellness + lifestyle portfolio.", date: "Jun 7" },
    ],
  },
];

const CLIENTS = [
  {
    name: "Luna Vita", contact: "Kea Moran", email: "kea@lunavita.com", phone: "(310) 555-0182",
    type: "Brand Identity + Social", status: "Active", tags: ["Brand", "Social", "Strategy"],
    value: 4800, valueLabel: "monthly", nextMeeting: "Jun 12 · 2:00 PM",
    lastActivity: "Sent brand deck v2 · Jun 8", deliverables: 3, notionUrl: "https://notion.so",
  },
  {
    name: "LACES", contact: "Jeff Williams", email: "jeff@lacesatl.com", phone: "(404) 555-0247",
    type: "Email Marketing Strategy", status: "Needs Attention", tags: ["Email", "Klaviyo", "Campaigns"],
    value: 5000, valueLabel: "monthly", nextMeeting: "Jun 10 · 10:00 AM",
    lastActivity: "Klaviyo flow proposal sent · Jun 7", deliverables: 2, notionUrl: "https://notion.so",
  },
  {
    name: "Luxx", contact: "Marcus Reid", email: "marcus@luxxco.com", phone: "(323) 555-0391",
    type: "Website + Branding", status: "Active", tags: ["Web", "Brand"],
    value: 12000, valueLabel: "project", nextMeeting: "Jun 14 · 3:30 PM",
    lastActivity: "Homepage wireframes approved · Jun 5", deliverables: 4, notionUrl: "https://notion.so",
  },
  {
    name: "Issa Rae Media", contact: "Issa Rae", email: "team@issaraemedia.com", phone: "(213) 555-0118",
    type: "Campaign Design", status: "Active", tags: ["Design", "Campaign"],
    value: 2400, valueLabel: "monthly", nextMeeting: "Jun 18 · 1:00 PM",
    lastActivity: "Campaign assets delivered · May 28", deliverables: 1, notionUrl: "https://notion.so",
  },
  {
    name: "Bluebell", contact: "Sophie Okafor", email: "sophie@bluebellbrand.com", phone: "(415) 555-0276",
    type: "Social Content", status: "Paused", tags: ["Social", "Content"],
    value: 1800, valueLabel: "monthly", nextMeeting: "—",
    lastActivity: "Contract paused · May 15", deliverables: 0, notionUrl: "https://notion.so",
  },
];

type AgentActivity = { time: string; label: string; note: string; tag: "URGENT" | "ACTION" | "FYI" | "DONE" | "FLAG" };
type Agent = {
  name: string; role: string; status: "active" | "scheduled" | "idle";
  desc: string; last: string;
  report: { summary: string; items: AgentActivity[] };
};

const AGENTS: Agent[] = [
  {
    name: "Amber", role: "Communication Manager", status: "active",
    desc: "Monitors Gmail, Slack, and WhatsApp. Classifies, drafts replies, executes approved dashboard actions.",
    last: "12 minutes ago · 3 items in queue",
    report: {
      summary: "3 items in your queue need attention. 1 urgent client reply, 1 proposal approval, and 1 vendor FYI flagged from this morning.",
      items: [
        { time: "12 min ago", label: "Gmail · Kea (Luna Vita)", note: "Replied asking about the brand deck timeline. Draft ready for review.", tag: "URGENT" },
        { time: "1 hr ago",   label: "Klaviyo proposal · Jeff (LACES)", note: "Updated flow proposal ready — approve to send.", tag: "ACTION" },
        { time: "3 hrs ago",  label: "Printful vendor quote", note: "Merch pricing for Luna Vita launch. No action needed.", tag: "FYI" },
      ],
    },
  },
  {
    name: "Mae", role: "System Librarian", status: "active",
    desc: "Audits Notion, cleans stale data, syncs file structure, ensures everything other agents read is accurate and current.",
    last: "45 minutes ago · All systems nominal",
    report: {
      summary: "Morning audit complete. All Notion databases clean, no stale tasks or duplicate pages found. File structure synced.",
      items: [
        { time: "45 min ago", label: "Notion audit complete", note: "7 databases scanned. 0 issues found.", tag: "DONE" },
        { time: "6:30 AM",    label: "Removed 2 duplicate client pages", note: "Luna Vita sandbox and draft merged into main client page.", tag: "DONE" },
        { time: "Yesterday",  label: "LACES folder reorganised", note: "Assets, contracts, and briefs moved to standardised structure.", tag: "DONE" },
      ],
    },
  },
  {
    name: "Liala", role: "Spirit Team", status: "active",
    desc: "Daily morning ritual — cycle phase guidance, meals, movement, nervous system support, and spiritual practice.",
    last: "7:00 AM · Day 22 Luteal",
    report: {
      summary: "Day 22 · Luteal phase. Energy turns inward — finishing > starting. High cortisol window 9–11am. Protect the afternoon.",
      items: [
        { time: "7:00 AM", label: "Phase guidance delivered", note: "Luteal day 22. Soft Power theme. Intention: finish what's in motion.", tag: "DONE" },
        { time: "7:00 AM", label: "Movement rec: slow yoga or walk", note: "No HIIT this week — nervous system in recovery mode.", tag: "FYI" },
        { time: "7:00 AM", label: "Nutrition note", note: "Prioritise magnesium + complex carbs today. Reduce caffeine after 12pm.", tag: "FYI" },
      ],
    },
  },
  {
    name: "Nancy", role: "Research Analyst", status: "scheduled",
    desc: "Monitors client industries, AI developments, market trends, and business opportunities. Posts daily intelligence brief.",
    last: "7:30 AM · 3 items surfaced",
    report: {
      summary: "3 intelligence items surfaced this morning. 1 direct opportunity flagged for your review — a brand partnership call from a peer agency.",
      items: [
        { time: "7:30 AM", label: "Opportunity · Agency partnership", note: "Mila & Co looking for a creative sub-contractor for Q3. Warm intro available.", tag: "FLAG" },
        { time: "7:30 AM", label: "AI trend · Canva launches AI video", note: "Relevant to Luna Vita content strategy. May shift their production budget.", tag: "FYI" },
        { time: "7:30 AM", label: "Industry · DTC beauty CPMs up 18%", note: "Luna Vita and LACES ad budgets may need reforecast for Q3.", tag: "FYI" },
      ],
    },
  },
  {
    name: "Milli", role: "Finance Watchdog", status: "scheduled",
    desc: "QuickBooks, Gusto, GHL, Stripe — monitors business and personal finances, flags overdue invoices and tax deadlines.",
    last: "7:45 AM · 1 flag: $5,000 pending",
    report: {
      summary: "1 flag this morning: LACES invoice #1047 ($5,000) is 4 days past due. All other invoices current. Payroll runs Friday — no issues.",
      items: [
        { time: "7:45 AM", label: "Invoice overdue · LACES #1047", note: "$5,000 — 4 days past due. Nudge sent via GHL. Follow up if no response by EOD.", tag: "FLAG" },
        { time: "7:45 AM", label: "Payroll · Friday $3,200", note: "Gusto scheduled. Sufficient balance confirmed.", tag: "DONE" },
        { time: "7:45 AM", label: "Monthly revenue · $24,850 Jun MTD", note: "On track for $28k target. 3 invoices outstanding.", tag: "FYI" },
      ],
    },
  },
  {
    name: "Sage", role: "Executive Partner", status: "active",
    desc: "Morning standup, daily priorities, opportunity scan. Reads all other agent reports and delivers your 8am brief to Slack.",
    last: "8:02 AM · Brief delivered to Slack",
    report: {
      summary: "Good morning brief delivered at 8:02am. 4 meetings today, 3 priority tasks, 1 opportunity flagged by Nancy. Amber has 3 items needing your approval.",
      items: [
        { time: "8:02 AM", label: "Morning brief sent to Slack", note: "All 7 agent reports compiled. 4 action items surfaced for you.", tag: "DONE" },
        { time: "8:02 AM", label: "Opportunity flagged", note: "Nancy flagged a brand partnership lead — review in Intelligence tab.", tag: "FLAG" },
        { time: "8:02 AM", label: "Highest priority today", note: "Luna Vita brand deck — Kea is waiting. Target: send draft by EOD Friday.", tag: "ACTION" },
      ],
    },
  },
  {
    name: "Milton", role: "Meeting Intelligence", status: "idle",
    desc: "Pulls from Granola, processes meeting transcripts, extracts action items, and proposes tasks to dashboard at 5pm.",
    last: "Yesterday 5:02 PM · 3 tasks proposed",
    report: {
      summary: "Yesterday's 5pm run processed 2 meetings. 3 action items proposed to dashboard — 2 accepted, 1 pending. Next run at 5pm today.",
      items: [
        { time: "Yesterday 5:02 PM", label: "LACES strategy call processed", note: "Extracted: send Klaviyo proposal, book next call, share deck draft.", tag: "DONE" },
        { time: "Yesterday 5:02 PM", label: "Ryan Lands check-in processed", note: "1 action item: follow up on contract renewal by Jun 12.", tag: "DONE" },
        { time: "Next run",          label: "Scheduled for 5:00 PM today", note: "Will process today's Luna Vita and Ryan Lands meetings.", tag: "FYI" },
      ],
    },
  },
  {
    name: "Lennard", role: "Legal / HR", status: "idle",
    desc: "Weekly legal, tax, and HR compliance check — CA filings, payroll, contracts, IRS deadlines. Runs Tuesdays.",
    last: "Tuesday · All clear",
    report: {
      summary: "Tuesday compliance check complete. No outstanding filings, deadlines, or contract issues. Next run Tuesday June 16.",
      items: [
        { time: "Tuesday", label: "CA compliance check", note: "All filings current. No state notices.", tag: "DONE" },
        { time: "Tuesday", label: "Contract review", note: "4 active contracts reviewed. Ryan Lands renewal due Jun 30 — flagged.", tag: "FLAG" },
        { time: "Tuesday", label: "IRS deadlines", note: "Next estimated tax payment: Sep 15. No immediate action.", tag: "FYI" },
      ],
    },
  },
];

const ACTIVITY_LOG = [
  { time: "8:02 AM", color: "#60C070", text: <><strong>Sage</strong> — Morning brief delivered to Slack · 4 meetings, 3 priority tasks, 1 opportunity flagged</> },
  { time: "7:45 AM", color: "#E8C040", text: <><strong>Milli</strong> — Finance check complete · $5,000 LACES invoice pending 4 days, flagged to dashboard</> },
  { time: "7:30 AM", color: "#60C070", text: <><strong>Nancy</strong> — Intelligence brief ready · 3 items surfaced, 1 opportunity flagged</> },
  { time: "6:45 AM", color: "#60C070", text: <><strong>Mae</strong> — Morning audit complete · All systems nominal, no issues found</> },
];

const SUBSTACK_POSTS = [
  { id: 1, title: "The Soft Power Issue", status: "In Progress", date: "Jun 8", subtitle: "What no one tells you about leading from rest", body: "There's a particular kind of exhaustion that comes not from doing too much, but from performing strength for too long.\n\nWe talk about hustle culture, but what about the quieter pressure — the one that says you should be further along, more certain, more visible by now?\n\nThis issue is about the other kind of power. The kind that doesn't announce itself." },
  { id: 2, title: "On Raising Rates", status: "Ready", date: "Jun 1", subtitle: "A guide for creative entrepreneurs who undercharge", body: "Your time is worth more than you think. Here's how to prove it to yourself first." },
  { id: 3, title: "AI Won't Replace You", status: "Published", date: "May 20", subtitle: "But it will replace the version of you that doesn't use it", body: "The creatives winning right now are not the ones ignoring AI. They're the ones who figured out how to stay human inside it." },
  { id: 4, title: "Brand Before Strategy", status: "Idea", date: "May 10", subtitle: "", body: "" },
];

// ─── API helpers ──────────────────────────────────────────────────────────────
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

// Session token fetched once from /api/auth/session-token; reused for all calls.
let _sessionToken: string | null = null;
async function getSessionToken(): Promise<string> {
  if (_sessionToken) return _sessionToken;
  const res = await fetch(`${BASE}/api/auth/session-token`);
  if (!res.ok) throw new Error("Could not obtain session token");
  const data = await res.json();
  _sessionToken = data.token as string;
  return _sessionToken;
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = await getSessionToken();
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-Dashboard-Secret": token,
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function RefreshBtn({ onClick }: { onClick?: () => void }) {
  return <button className="refresh-btn" onClick={onClick} title="Refresh">↻</button>;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    "To Do": "pill-todo", "In Progress": "pill-progress", "Done": "pill-done",
    "Waiting": "pill-waiting", "Blocked": "pill-todo",
  };
  return <span className={map[status] || "pill-todo"}>{status}</span>;
}

function InvoiceStatus({ s }: { s: string }) {
  if (s === "Paid") return <span className="status-paid">Paid</span>;
  if (s === "Pending") return <span className="status-pending">Pending</span>;
  return <span className="status-overdue">Overdue</span>;
}

// ─── Priorities panel ─────────────────────────────────────────────────────────
function PrioritiesPanel() {
  const [tasks, setTasks] = useState<Task[]>(
    [...TASKS_SEED].sort((a, b) => a.sortDate.localeCompare(b.sortDate))
  );
  const [expanded, setExpanded] = useState<number | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<string>(formatTime());
  const dbId = import.meta.env.VITE_NOTION_TASKS_DB_ID;

  async function loadTasks() {
    setLoading(true);
    try {
      const url = dbId ? `/notion/tasks?db=${encodeURIComponent(dbId)}` : "/notion/tasks";
      const data = await apiFetch<{ tasks: Task[] }>(url);
      if (data.tasks?.length) {
        setTasks(data.tasks.sort((a, b) => a.sortDate.localeCompare(b.sortDate)));
        setLastSynced(formatTime());
      }
    } catch {
      // silently keep mock data
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTasks(); }, []);

  function toggleExpand(id: number) {
    setExpanded(prev => prev === id ? null : id);
  }

  async function cycleStatus(task: Task, e: React.MouseEvent) {
    e.stopPropagation();
    const next = STATUS_CYCLE[task.status] ?? "To Do";
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t));
    setSyncing(task.id);
    setSyncError(null);
    try {
      // if it's a real Notion ID (UUID format), patch it
      if (task.notionId && !task.notionId.startsWith("task-")) {
        await apiFetch(`/notion/tasks/${task.notionId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: next }),
        });
      }
    } catch {
      setSyncError(task.id);
      setTimeout(() => setSyncError(null), 2500);
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      {loading && tasks === TASKS_SEED.sort() && (
        <div style={{ fontSize: 12, color: "var(--text-xsoft)", padding: "8px 0" }}>Loading from Notion…</div>
      )}
      {tasks.map(t => (
        <div key={t.id}>
          <div
            className={`task-row task-row-clickable ${expanded === t.id ? "task-row-open" : ""}`}
            onClick={() => toggleExpand(t.id)}
          >
            <div className="task-check" onClick={e => { e.stopPropagation(); cycleStatus(t, e); }} title="Click to advance status" />
            <div className="task-name">{t.name}</div>
            <div className="task-date">{t.date}</div>
            <button
              className={`task-status-pill ${
                t.status === "To Do" ? "pill-todo" :
                t.status === "In Progress" ? "pill-progress" : "pill-done"
              } ${syncing === t.id ? "pill-syncing" : ""}`}
              onClick={e => cycleStatus(t, e)}
              title="Click to change status"
            >
              {syncing === t.id ? "…" : t.status}
            </button>
            <span className={`task-expand-arrow ${expanded === t.id ? "open" : ""}`}>›</span>
          </div>
          {expanded === t.id && (
            <div className="task-detail">
              {syncError === t.id && (
                <div className="task-sync-error">⚠ Notion sync failed — update saved locally</div>
              )}
              <div className="task-detail-row">
                <span className="task-detail-label">Client</span>
                <span className="task-detail-value">{t.client}</span>
              </div>
              <div className="task-detail-row">
                <span className="task-detail-label">Due</span>
                <span className="task-detail-value">{t.date}</span>
              </div>
              {t.notes && (
                <div className="task-detail-row task-detail-notes">
                  <span className="task-detail-label">Notes</span>
                  <span className="task-detail-value">{t.notes}</span>
                </div>
              )}
              <div className="task-status-row">
                {(["To Do", "In Progress", "Done"] as const).map(s => (
                  <button
                    key={s}
                    className={`task-status-option ${t.status === s ? "active" : ""}`}
                    onClick={e => {
                      e.stopPropagation();
                      if (t.status !== s) {
                        const next = s;
                        setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: next } : x));
                        setSyncing(t.id);
                        setSyncError(null);
                        apiFetch(`/notion/tasks/${t.notionId}`, {
                          method: "PATCH",
                          body: JSON.stringify({ status: next }),
                        }).catch(() => { setSyncError(t.id); setTimeout(() => setSyncError(null), 2500); })
                          .finally(() => setSyncing(null));
                      }
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Sage Chat Widget (floating, available on all tabs) ───────────────────────
function SageChatWidget() {
  const [open, setOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "sage" | "user"; text: string }[]>([
    { role: "sage", text: "Good morning! You have 4 meetings today and 3 items in your queue. Your highest priority is the Luna Vita reply — Kea has been waiting since this morning." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [chatMessages, open]);

  function sendChat() {
    const msg = chatInput.trim();
    if (!msg || sending) return;
    setChatMessages(prev => [...prev, { role: "user", text: msg }]);
    setChatInput("");
    setSending(true);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { role: "sage", text: "I'm pulling that together for you now. Give me one moment..." }]);
      setSending(false);
    }, 900);
  }

  return (
    <>
      {/* Floating button in nav */}
      <button
        className={`sage-fab ${open ? "sage-fab-open" : ""}`}
        onClick={() => setOpen(o => !o)}
        title="Sage — your executive partner"
      >
        <span className="sage-fab-icon">✦</span>
        <span className="sage-fab-label">Sage</span>
      </button>

      {/* Floating chat panel */}
      {open && (
        <div className="sage-panel">
          <div className="sage-panel-header">
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: 16 }}>Sage</div>
              <div style={{ fontSize: 11, color: "var(--text-xsoft)", marginTop: 1 }}>Your executive partner · ready to help</div>
            </div>
            <button className="cal-icon-btn" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="chat-messages sage-panel-messages" ref={messagesRef}>
            {chatMessages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>
            ))}
            {sending && <div className="chat-msg sage" style={{ opacity: 0.6 }}>...</div>}
          </div>
          <div className="sage-panel-footer">
            <div className="chat-input-row">
              <input
                className="chat-input"
                type="text"
                placeholder="Ask Sage anything..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendChat(); }}
                autoFocus
              />
              <button className="btn-send-chat" onClick={sendChat}>Send</button>
            </div>
            <div className="powered-by" style={{ marginTop: 6 }}>Powered by Claude via Supabase</div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── View: HOME ───────────────────────────────────────────────────────────────
function HomeView() {
  const [calOpen, setCalOpen] = useState(false);
  const closeCalendar = useCallback(() => setCalOpen(false), []);
  const [agentQuickView, setAgentQuickView] = useState<Agent | null>(null);
  const [schedule, setSchedule] = useState<{ time: string; event: string }[]>(SCHEDULE_MOCK);
  const [scheduleLoading, setScheduleLoading] = useState(true);

  async function loadSchedule() {
    setScheduleLoading(true);
    try {
      const data = await apiFetch<{ events: { timeDisplay: string; title: string }[] }>("/gcal/events?days=1");
      if (data.events?.length) {
        setSchedule(data.events.map(e => ({ time: e.timeDisplay, event: e.title })));
      }
    } catch {
      // keep mock
    } finally {
      setScheduleLoading(false);
    }
  }

  useEffect(() => { loadSchedule(); }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-greeting">{getGreeting()}, Gabby.</h1>
      </div>

      <div className="home-grid">
        {/* LEFT — Schedule */}
        <div>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-label">Today's Schedule</div>
              </div>
              <RefreshBtn onClick={loadSchedule} />
            </div>
            {scheduleLoading && schedule === SCHEDULE_MOCK && (
              <div style={{ fontSize: 12, color: "var(--text-xsoft)", padding: "8px 0" }}>Loading from Google Calendar…</div>
            )}
            {schedule.map((s, i) => (
              <div className="schedule-item" key={i}>
                <span className="schedule-time">{s.time}</span>
                <span className="schedule-name">{s.event}</span>
              </div>
            ))}
            <button
              className="card-link"
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
              onClick={() => setCalOpen(true)}
            >
              View full calendar →
            </button>
          </div>
        </div>

        {/* RIGHT — Priorities */}
        <div>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-label">Today's Priorities</div>
                <div className="card-subtitle" style={{ marginBottom: 0 }}>synced at {formatTime()}</div>
              </div>
              <RefreshBtn />
            </div>
            <PrioritiesPanel />
          </div>
        </div>
      </div>

      {/* Full-width Needs Attention */}
      <div className="card" style={{ marginTop: 0 }}>
        <div className="card-header">
          <div>
            <div className="card-label">Needs Your Attention</div>
            <div className="card-subtitle" style={{ marginBottom: 0 }}>Proposals from Amber</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="filter-pills" style={{ margin: 0 }}>
              <button className="pill active">All (2)</button>
              <button className="pill">Urgent (1)</button>
              <button className="pill">Action (1)</button>
            </div>
            <RefreshBtn />
          </div>
        </div>

        <div className="attention-grid">
          <div className="attention-card">
            <div className="attention-meta">
              <span className="badge badge-high">HIGH</span>
              <span className="badge badge-source">Gmail</span>
              <span className="badge badge-client">Luna Vita</span>
              <span className="badge-time">2 hours ago</span>
            </div>
            <div className="attention-summary">Kea replied asking about the brand deck timeline</div>
            <div className="attention-why">Active deliverable in progress — client is waiting on your response</div>
            <div className="draft-label">Draft Reply</div>
            <textarea className="draft-textarea" defaultValue="Hey Kea! The brand deck is coming together beautifully. I'm targeting end of day Friday to send over the first full draft. Want to set up a quick 20-minute review call for next Monday? Let me know what works!" />
            <div className="action-btns">
              <button className="btn btn-send">Send ✓</button>
              <button className="btn btn-approve">Edit + Send ✎</button>
              <button className="btn btn-dismiss">Dismiss</button>
            </div>
          </div>

          <div className="attention-card">
            <div className="attention-meta">
              <span className="badge badge-task">TASK</span>
              <span className="badge badge-source">Meeting Notes</span>
              <span className="badge badge-client">LACES</span>
              <span className="badge-time">yesterday</span>
            </div>
            <div className="attention-summary">Send updated Klaviyo flow proposal to Jeff by Thursday</div>
            <div className="attention-why">From LACES strategy call — Jeff expecting follow-up this week</div>
            <div className="action-btns">
              <button className="btn btn-approve">Approve ✓</button>
              <button className="btn btn-send">Edit + Approve ✎</button>
              <button className="btn btn-dismiss">Deny ✕</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Stats ── Tasks + Invoices ───────────────────── */}
      {(() => {
        const today = new Date();
        const todayISO = isoDate(today);
        const weekEnd = isoDate(addDays(weekStart(today), 6));
        const monthStr = today.toLocaleString("en-US", { month: "short" }); // "Jun"

        const overdue  = TASKS_SEED.filter(t => t.sortDate < todayISO && t.status !== "Done").length;
        const dueToday = TASKS_SEED.filter(t => t.sortDate === todayISO && t.status !== "Done").length;
        const dueWeek  = TASKS_SEED.filter(t => t.sortDate > todayISO && t.sortDate <= weekEnd && t.status !== "Done").length;
        const dueMonth = TASKS_SEED.filter(t => t.sortDate.startsWith(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`) && t.status !== "Done").length;

        const parseAmt = (s: string) => Number(s.replace(/[$,]/g, ""));
        const monthInvoices = INVOICES.filter(inv => inv.date.startsWith(monthStr));
        const sentAmt   = monthInvoices.reduce((s, i) => s + parseAmt(i.amount), 0);
        const paidAmt   = monthInvoices.filter(i => i.status === "Paid").reduce((s, i) => s + parseAmt(i.amount), 0);
        const paidCount = monthInvoices.filter(i => i.status === "Paid").length;
        const outstandingAmt = INVOICES.filter(i => i.status !== "Paid").reduce((s, i) => s + parseAmt(i.amount), 0);
        const fmtUSD = (n: number) => `$${n.toLocaleString()}`;

        return (
          <div className="quick-stats-card card">
            <div className="quick-stats-row">
              {/* Task buckets */}
              <div className="qs-section">
                <div className="qs-section-label">Tasks</div>
                <div className="qs-items">
                  {overdue > 0 && (
                    <div className="qs-item qs-overdue">
                      <span className="qs-num">{overdue}</span>
                      <span className="qs-label">Overdue</span>
                    </div>
                  )}
                  <div className="qs-item">
                    <span className="qs-num">{dueToday}</span>
                    <span className="qs-label">Due today</span>
                  </div>
                  <div className="qs-item">
                    <span className="qs-num">{dueWeek}</span>
                    <span className="qs-label">Due this week</span>
                  </div>
                  <div className="qs-item">
                    <span className="qs-num">{dueMonth}</span>
                    <span className="qs-label">Due this month</span>
                  </div>
                </div>
              </div>

              <div className="qs-divider" />

              {/* Invoice summary */}
              <div className="qs-section">
                <div className="qs-section-label">Invoices · {monthStr}</div>
                <div className="qs-items">
                  <div className="qs-item">
                    <span className="qs-num">{fmtUSD(sentAmt)}</span>
                    <span className="qs-label">{monthInvoices.length} sent this month</span>
                  </div>
                  <div className="qs-item qs-paid">
                    <span className="qs-num">{fmtUSD(paidAmt)}</span>
                    <span className="qs-label">{paidCount} paid</span>
                  </div>
                  <div className="qs-item qs-outstanding">
                    <span className="qs-num">{fmtUSD(outstandingAmt)}</span>
                    <span className="qs-label">outstanding (all)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Full-width Liala */}
      <div className="card" style={{ background: "linear-gradient(135deg, rgba(180,120,220,0.18), rgba(232,160,64,0.13))", cursor: "pointer" }}>
        <div className="card-label" style={{ color: "#9060C0" }}>Liala · Spirit Team</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 6, letterSpacing: "-0.3px" }}>Soft Power</div>
        <div style={{ fontSize: 13, color: "var(--text-soft)", fontStyle: "italic", lineHeight: 1.6 }}>You're in your luteal phase — the time of the wise woman. Your energy turns inward today. Finish what's already in motion.</div>
      </div>

      {/* ── Agent Activity ───────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-label">Agent Activity</div>
            <div className="card-subtitle" style={{ marginBottom: 0 }}>Your multi-agent operating system · today</div>
          </div>
          <RefreshBtn />
        </div>
        <div className="agent-activity-grid">
          {AGENTS.map((a, i) => (
            <div className="agent-activity-row" key={i} onClick={() => setAgentQuickView(a)} style={{ cursor: "pointer" }}>
              <div className="agent-activity-left">
                <div className={`agent-dot dot-${a.status}`} style={{ flexShrink: 0 }} />
                <div>
                  <div className="agent-activity-name">
                    <span className="agent-activity-name-link">{a.name}</span>
                    {" "}<span className="agent-activity-role">{a.role}</span>
                  </div>
                  <div className="agent-activity-last">{a.last}</div>
                </div>
              </div>
              <span className={`agent-status-badge status-${a.status}`} style={{ flexShrink: 0 }}>
                {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mac Mini — bottom */}
      <div className="card">
        <div className="card-label">Mac Mini</div>
        <div className="card-subtitle">Remote control your agent hub</div>
        <div className="mac-mini-btns">
          <button className="btn-mac" onClick={() => alert("Sending Wake-on-LAN signal…\n\nConnect Tailscale + Supabase edge function to activate.")}>
            <div className="btn-mac-icon">🌐</div>
            <span className="btn-mac-label">Wake Mac Mini</span>
            <div className="btn-mac-sub">Send WoL signal</div>
          </button>
          <button className="btn-mac" onClick={() => alert("Configure MAC_MINI_TAILSCALE_IP in Replit Secrets to enable screen share.")}>
            <div className="btn-mac-icon">🖥</div>
            <span className="btn-mac-label">Screen Share</span>
            <div className="btn-mac-sub">Open remote session</div>
          </button>
        </div>
      </div>

      {calOpen && <CalendarModal onClose={closeCalendar} />}
      {agentQuickView && <AgentQuickView agent={agentQuickView} onClose={() => setAgentQuickView(null)} />}
    </div>
  );
}

// ─── Agent Quick View ─────────────────────────────────────────────────────────
const TAG_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  URGENT: { bg: "rgba(220,80,60,0.12)",   color: "#B04040", label: "Urgent" },
  ACTION: { bg: "rgba(232,160,64,0.15)",  color: "#C47820", label: "Action" },
  FLAG:   { bg: "rgba(232,160,64,0.15)",  color: "#C47820", label: "Flag" },
  FYI:    { bg: "rgba(90,120,200,0.12)",  color: "#4060A0", label: "FYI" },
  DONE:   { bg: "rgba(80,160,100,0.12)",  color: "#407840", label: "Done" },
};

function AgentQuickView({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  // Close on backdrop click
  return (
    <div className="aqv-overlay" onClick={onClose}>
      <div className="aqv-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="aqv-header">
          <div className="aqv-header-left">
            <div className={`agent-dot dot-${agent.status}`} style={{ width: 11, height: 11 }} />
            <div>
              <div className="aqv-name">{agent.name}</div>
              <div className="aqv-role">{agent.role}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`agent-status-badge status-${agent.status}`}>
              {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
            </span>
            <button className="aqv-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Summary */}
        <div className="aqv-summary">{agent.report.summary}</div>

        {/* Last active */}
        <div className="aqv-last-active">Last active: {agent.last}</div>

        {/* Divider */}
        <div className="aqv-divider" />

        {/* Activity items */}
        <div className="aqv-section-label">Recent Activity</div>
        <div className="aqv-items">
          {agent.report.items.map((item, i) => {
            const ts = TAG_STYLES[item.tag] ?? TAG_STYLES.FYI;
            return (
              <div className="aqv-item" key={i}>
                <div className="aqv-item-top">
                  <span className="aqv-item-label">{item.label}</span>
                  <span className="aqv-item-tag" style={{ background: ts.bg, color: ts.color }}>{ts.label}</span>
                </div>
                <div className="aqv-item-note">{item.note}</div>
                <div className="aqv-item-time">{item.time}</div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="aqv-footer">
          <span className="aqv-footer-hint">Click outside to close</span>
        </div>
      </div>
    </div>
  );
}

// ─── New Client Modal ─────────────────────────────────────────────────────────
const SERVICE_OPTIONS = ["Brand Identity", "Social Content", "Email Marketing", "Website", "Campaign Design", "Strategy", "Consulting", "Other"];

function NewClientModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: "", contact: "", email: "", phone: "",
    services: [] as string[], contractType: "monthly",
    value: "", startDate: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function toggleService(s: string) {
    setForm(f => ({
      ...f,
      services: f.services.includes(s) ? f.services.filter(x => x !== s) : [...f.services, s],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/notion/clients", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          type: form.services.join(", "),
          db: import.meta.env.VITE_NOTION_CLIENTS_DB_ID,
        }),
      });
      setSaved(true);
      setTimeout(onClose, 2000);
    } catch (err: any) {
      setError(err?.message?.includes("database ID")
        ? "Set VITE_NOTION_CLIENTS_DB_ID in Replit Secrets to create clients in Notion."
        : "Could not create in Notion. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">New Client</div>
            <div className="modal-sub">Creates a new page in your Notion CRM · powered by Milli</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {saved ? (
          <div className="ncm-success">
            <div style={{ fontSize: 40 }}>✓</div>
            <div>Client created in Notion!</div>
            <div style={{ fontSize: 13, color: "var(--text-soft)", fontFamily: "'Inter', sans-serif" }}>Closing…</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="ncm-form">
            <div className="ncm-row-2">
              <div className="ncm-field">
                <label className="ncm-label">Company Name *</label>
                <input className="ncm-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Luna Vita" />
              </div>
              <div className="ncm-field">
                <label className="ncm-label">Contact Name *</label>
                <input className="ncm-input" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} required placeholder="e.g. Kea Moran" />
              </div>
            </div>
            <div className="ncm-row-2">
              <div className="ncm-field">
                <label className="ncm-label">Email *</label>
                <input className="ncm-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="contact@company.com" />
              </div>
              <div className="ncm-field">
                <label className="ncm-label">Phone</label>
                <input className="ncm-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" />
              </div>
            </div>
            <div className="ncm-field">
              <label className="ncm-label">Services</label>
              <div className="ncm-services">
                {SERVICE_OPTIONS.map(s => (
                  <button type="button" key={s}
                    className={`ncm-service-btn ${form.services.includes(s) ? "selected" : ""}`}
                    onClick={() => toggleService(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="ncm-row-2">
              <div className="ncm-field">
                <label className="ncm-label">Contract Type</label>
                <select className="ncm-input" value={form.contractType} onChange={e => setForm(f => ({ ...f, contractType: e.target.value }))}>
                  <option value="monthly">Monthly Retainer</option>
                  <option value="project">Project-Based</option>
                </select>
              </div>
              <div className="ncm-field">
                <label className="ncm-label">Value ($)</label>
                <input className="ncm-input" type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0" min="0" />
              </div>
            </div>
            <div className="ncm-field">
              <label className="ncm-label">Start Date</label>
              <input className="ncm-input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="ncm-field">
              <label className="ncm-label">Notes / Goals</label>
              <textarea className="ncm-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Project overview, goals, anything important to note…" rows={3} />
            </div>
            {error && <div style={{ fontSize: 12, color: "#C04040", background: "rgba(200,60,60,0.08)", padding: "8px 12px", borderRadius: 8 }}>{error}</div>}
            <div className="ncm-footer">
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-accent" disabled={saving}>
                {saving ? "Creating…" : "✦ Create in Notion"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── View: CLIENTS ────────────────────────────────────────────────────────────
function ClientsView() {
  const [filter, setFilter] = useState<"all" | "Active" | "Needs Attention" | "Paused">("all");
  const [showNewClient, setShowNewClient] = useState(false);
  const [clients, setClients] = useState(CLIENTS);
  const [clientsLoading, setClientsLoading] = useState(true);
  const dbId = import.meta.env.VITE_NOTION_CLIENTS_DB_ID;

  async function loadClients() {
    setClientsLoading(true);
    try {
      const url = dbId ? `/notion/clients?db=${encodeURIComponent(dbId)}` : "/notion/clients";
      const data = await apiFetch<{ clients: typeof CLIENTS }>(url);
      if (data.clients?.length) setClients(data.clients);
    } catch {
      // keep mock
    } finally {
      setClientsLoading(false);
    }
  }

  useEffect(() => { loadClients(); }, []);

  const filtered = filter === "all" ? clients : clients.filter(c => c.status === filter);
  const activeClients = clients.filter(c => c.status === "Active");
  const monthlyRetainer = activeClients.filter(c => c.valueLabel === "monthly").reduce((s, c) => s + Number(c.value), 0);
  const totalDeliverables = clients.reduce((s, c) => s + (c.deliverables ?? 0), 0);
  const nextMtg = clients.find(c => c.nextMeeting !== "—");

  const AVATAR_COLORS = ["#E8A040", "#9060C0", "#60A878", "#C06060", "#4080C0"];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-greeting">Clients</h1>
        <p className="page-subtitle">Your active roster · synced from Notion</p>
      </div>

      {/* Summary stats */}
      <div className="four-col" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Active Clients</div>
          <div className="stat-value">{activeClients.length}</div>
          <div className="stat-sub">{clients.length} total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly Retainer</div>
          <div className="stat-value">${monthlyRetainer.toLocaleString()}</div>
          <div className="stat-sub">Recurring revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Deliverables</div>
          <div className="stat-value">{totalDeliverables}</div>
          <div className="stat-sub">Across all clients</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Next Meeting</div>
          <div className="stat-value" style={{ fontSize: 16, lineHeight: 1.2 }}>{nextMtg?.name ?? "—"}</div>
          <div className="stat-sub">{nextMtg?.nextMeeting ?? ""}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div className="filter-pills">
          {(["all", "Active", "Needs Attention", "Paused"] as const).map(f => (
            <button key={f} className={`pill ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? `All (${clients.length})` : `${f} (${clients.filter(c => c.status === f).length})`}
            </button>
          ))}
        </div>
        <button className="btn btn-accent" onClick={() => setShowNewClient(true)}>+ New Client</button>
      </div>

      {/* Client cards */}
      {filtered.map((c, i) => {
        const initials = c.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2);
        const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
        const borderClass = `status-border-${c.status.replace(/ /g, "-").toLowerCase()}`;
        const badgeClass = `cstatus-${c.status.replace(/ /g, "-").toLowerCase()}`;
        return (
          <div className={`client-card-v2 ${borderClass}`} key={i}>
            <div className="ccv2-header">
              <div className="ccv2-avatar" style={{ background: color }}>{initials}</div>
              <div className="ccv2-info">
                <div className="ccv2-name">{c.name}</div>
                <div className="ccv2-contact">
                  {c.contact} · <a href={`mailto:${c.email}`} className="ccv2-link">{c.email}</a>
                  {c.phone && <span style={{ color: "var(--text-xsoft)" }}> · {c.phone}</span>}
                </div>
              </div>
              <div className="ccv2-header-right">
                <span className={`client-status-badge ${badgeClass}`}>{c.status}</span>
                <div className="ccv2-value">
                  ${c.value.toLocaleString()}
                  <span className="ccv2-value-label">/{c.valueLabel === "monthly" ? "mo" : "project"}</span>
                </div>
              </div>
            </div>

            <div className="ccv2-details">
              <div className="ccv2-detail-item">
                <span className="ccv2-detail-label">Services</span>
                <span className="ccv2-detail-val">{c.type}</span>
              </div>
              <div className="ccv2-detail-item">
                <span className="ccv2-detail-label">Next Meeting</span>
                <span className="ccv2-detail-val">{c.nextMeeting}</span>
              </div>
              <div className="ccv2-detail-item">
                <span className="ccv2-detail-label">Last Activity</span>
                <span className="ccv2-detail-val">{c.lastActivity}</span>
              </div>
              <div className="ccv2-detail-item">
                <span className="ccv2-detail-label">Deliverables</span>
                <span className="ccv2-detail-val">{c.deliverables} active</span>
              </div>
            </div>

            <div className="ccv2-footer">
              <div className="client-tags">
                {c.tags.map((t: string, j: number) => <span className="client-tag" key={j}>{t}</span>)}
              </div>
              <div className="ccv2-actions">
                <button className="ccv2-action-btn" onClick={() => window.open(c.notionUrl, "_blank")}>Open in Notion ↗</button>
                <button className="ccv2-action-btn" onClick={() => { window.location.href = `mailto:${c.email}`; }}>Email</button>
                <button className="ccv2-action-btn" onClick={() => alert(`Invoice history for ${c.name}`)}>Invoices</button>
              </div>
            </div>
          </div>
        );
      })}

      {showNewClient && <NewClientModal onClose={() => setShowNewClient(false)} />}
    </div>
  );
}

// ─── View: FINANCE ────────────────────────────────────────────────────────────
function FinanceView() {
  const maxVal = Math.max(...REVENUE_DATA.map(r => r.val));
  return (
    <div>
      <div className="page-header">
        <h1 className="page-greeting">Finance</h1>
        <p className="page-subtitle">Revenue, invoices, and financial health · powered by Milli</p>
      </div>

      <div className="three-col" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-label">MTD Revenue</div>
          <div className="stat-value">$12,400</div>
          <div className="stat-sub">+8% vs last month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Outstanding</div>
          <div className="stat-value">$8,200</div>
          <div className="stat-sub">2 invoices pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">YTD Revenue</div>
          <div className="stat-value">$73,000</div>
          <div className="stat-sub">On track for $120K goal</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-label">Revenue by Month</div>
          <RefreshBtn />
        </div>
        <div className="chart-bars">
          {REVENUE_DATA.map((r, i) => (
            <div className="chart-col" key={i}>
              <span className="chart-val">${(r.val / 1000).toFixed(0)}K</span>
              <div className="chart-bar-wrap">
                <div className="chart-bar" style={{ height: `${(r.val / maxVal) * 100}%` }} title={`$${r.val.toLocaleString()}`} />
              </div>
              <span className="chart-month">{r.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-label">Invoices</div>
          <RefreshBtn />
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Project</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((inv, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{inv.client}</td>
                <td style={{ color: "var(--text-soft)" }}>{inv.project}</td>
                <td style={{ fontWeight: 600, fontSize: 14 }}>{inv.amount}</td>
                <td style={{ color: "var(--text-xsoft)" }}>{inv.date}</td>
                <td><InvoiceStatus s={inv.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── PERSONAL FINANCE ─────────────────────────────────── */}
      <div className="pf-section-divider">
        <div className="pf-divider-line" />
        <span className="pf-divider-label">Personal Finance</span>
        <div className="pf-divider-line" />
      </div>

      {/* Portfolio summary stats */}
      {(() => {
        const totalPortfolio = INVESTMENT_ACCOUNTS.reduce((s, a) => s + a.value, 0);
        const totalGain = HOLDINGS.reduce((s, h) => s + h.gain, 0);
        const todayChange = 340;
        return (
          <div className="three-col" style={{ marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-label">Total Portfolio</div>
              <div className="stat-value">${totalPortfolio.toLocaleString()}</div>
              <div className="stat-sub">Across all accounts</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Today's Change</div>
              <div className="stat-value pf-positive">+${todayChange.toLocaleString()}</div>
              <div className="stat-sub">+0.36% · Jun 9</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Return</div>
              <div className="stat-value pf-positive">+${totalGain.toLocaleString()}</div>
              <div className="stat-sub">+{((totalGain / (totalPortfolio - totalGain)) * 100).toFixed(1)}% all time</div>
            </div>
          </div>
        );
      })()}

      {/* Investment Accounts */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-label">Investment Accounts</div>
            <div className="card-subtitle" style={{ marginBottom: 0 }}>Synced balances · as of today</div>
          </div>
          <RefreshBtn />
        </div>
        <div className="pf-accounts-grid">
          {INVESTMENT_ACCOUNTS.map((acct, i) => (
            <div className="pf-account-card" key={i}>
              <div className="pf-account-icon">{acct.icon}</div>
              <div className="pf-account-info">
                <div className="pf-account-name">{acct.name}</div>
                <div className="pf-account-type">{acct.type}</div>
              </div>
              <div className="pf-account-right">
                <div className="pf-account-value">${acct.value.toLocaleString()}</div>
                <div className={`pf-account-change ${acct.change >= 0 ? "pf-positive" : "pf-negative"}`}>
                  {acct.change >= 0 ? "+" : ""}{acct.change}% YTD
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Holdings + Allocation side by side */}
      <div className="pf-bottom-grid">
        {/* Holdings table */}
        <div className="card">
          <div className="card-header">
            <div className="card-label">Holdings</div>
            <RefreshBtn />
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Shares</th>
                <th>Price</th>
                <th>Value</th>
                <th>Gain / Loss</th>
              </tr>
            </thead>
            <tbody>
              {HOLDINGS.map((h, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{h.ticker}</div>
                    <div style={{ fontSize: 11, color: "var(--text-xsoft)", marginTop: 1 }}>{h.name}</div>
                  </td>
                  <td style={{ color: "var(--text-soft)" }}>{h.shares}</td>
                  <td style={{ fontWeight: 500 }}>{h.price}</td>
                  <td style={{ fontWeight: 600 }}>${h.value.toLocaleString()}</td>
                  <td>
                    <span className={h.gain >= 0 ? "pf-positive" : "pf-negative"} style={{ fontWeight: 600, fontSize: 13 }}>
                      {h.gain >= 0 ? "+" : ""}${Math.abs(h.gain).toLocaleString()}
                    </span>
                    <span className={`pf-pct-badge ${h.pct >= 0 ? "pf-badge-pos" : "pf-badge-neg"}`}>
                      {h.pct >= 0 ? "+" : ""}{h.pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Allocation */}
        <div className="card pf-alloc-card">
          <div className="card-label" style={{ marginBottom: 16 }}>Allocation</div>
          <div className="pf-alloc-bar-row">
            {ALLOCATION.map((a, i) => (
              <div
                key={i}
                className="pf-alloc-bar-seg"
                style={{ width: `${a.pct}%`, background: a.color }}
                title={`${a.label}: ${a.pct}%`}
              />
            ))}
          </div>
          <div className="pf-alloc-legend">
            {ALLOCATION.map((a, i) => (
              <div className="pf-alloc-legend-item" key={i}>
                <div className="pf-alloc-dot" style={{ background: a.color }} />
                <span className="pf-alloc-item-label">{a.label}</span>
                <span className="pf-alloc-item-pct">{a.pct}%</span>
              </div>
            ))}
          </div>

          <div className="pf-divider-line" style={{ margin: "20px 0 16px" }} />

          <div className="card-label" style={{ marginBottom: 12, fontSize: 11 }}>Quick Actions</div>
          <div className="pf-actions">
            <button className="pf-action-btn" onClick={() => alert("Connect brokerage via Plaid to enable live data.")}>
              🔗 Link Account
            </button>
            <button className="pf-action-btn" onClick={() => alert("Transfer funds — coming soon.")}>
              💸 Transfer
            </button>
            <button className="pf-action-btn" onClick={() => alert("Full analysis report — coming soon.")}>
              📊 Report
            </button>
            <button className="pf-action-btn" onClick={() => alert("Set investment goals — coming soon.")}>
              🎯 Goals
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── View: INTELLIGENCE ───────────────────────────────────────────────────────
function IntelligenceView() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-greeting">Intelligence</h1>
        <p className="page-subtitle">AI-curated updates, industry signals, and opportunities · powered by Nancy</p>
      </div>
      {INTEL_ITEMS.map((section, i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <div className="intel-section-title">{section.section}</div>
          <div className="two-col">
            {section.items.map((item, j) => (
              <div className="intel-card" key={j}>
                <span className="intel-source">{item.source}</span>
                <div className="intel-headline">{item.headline}</div>
                <div className="intel-summary">{item.summary}</div>
                <div className="intel-date">{item.date}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── View: SUBSTACK ───────────────────────────────────────────────────────────
function SubstackView() {
  const [selected, setSelected] = useState(SUBSTACK_POSTS[0]);

  const statusColors: Record<string, string> = {
    "In Progress": "pill-progress",
    "Ready": "pill-done",
    "Published": "status-paid",
    "Idea": "pill-todo",
    "Draft": "pill-todo",
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-greeting">Substack</h1>
        <p className="page-subtitle">Write, edit, and publish your newsletter</p>
      </div>
      <div className="substack-layout">
        <div className="post-list">
          <div className="post-list-header">
            <span style={{ fontWeight: 600, fontSize: 14 }}>Posts</span>
            <button className="btn btn-accent" style={{ fontSize: 11, padding: "4px 12px" }}>+ New</button>
          </div>
          <div className="filter-pills" style={{ padding: "10px 14px 0", flexWrap: "wrap", gap: 4 }}>
            <button className="pill active" style={{ fontSize: 11 }}>All</button>
            <button className="pill" style={{ fontSize: 11 }}>Draft</button>
            <button className="pill" style={{ fontSize: 11 }}>Published</button>
          </div>
          {SUBSTACK_POSTS.map(p => (
            <div key={p.id} className={`post-item ${selected.id === p.id ? "selected" : ""}`} onClick={() => setSelected(p)}>
              <div className="post-item-title">{p.title}</div>
              <div className="post-item-meta">
                <span className={statusColors[p.status] || "pill-todo"} style={{ fontSize: 10, padding: "2px 8px" }}>{p.status}</span>
                <span style={{ fontSize: 11, color: "var(--text-xsoft)" }}>{p.date}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="editor-panel">
          <input className="editor-title" defaultValue={selected.title} key={`title-${selected.id}`} placeholder="Post title..." />
          <input className="editor-subtitle" defaultValue={selected.subtitle} key={`sub-${selected.id}`} placeholder="Subtitle..." />
          <div className="editor-toolbar">
            {["B", "I", "H2", "Link", "Quote", "Bullets", "Numbers", "Image"].map(t => (
              <button className="toolbar-btn" key={t}>{t}</button>
            ))}
          </div>
          <textarea className="editor-body" defaultValue={selected.body} key={`body-${selected.id}`} placeholder="Start writing..." />
          <div className="editor-actions">
            <button className="btn btn-accent">Publish</button>
            <button className="btn btn-approve">Schedule</button>
            <button className="btn btn-dismiss">Save Draft</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── View: SPIRIT ─────────────────────────────────────────────────────────────
function SpiritView() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-greeting">Good morning, Gabby.</h1>
        <p className="page-subtitle">{formatDate()} · Day 22 · Luteal Phase</p>
      </div>

      <div className="spirit-hero">
        <div className="cycle-phase">Luteal Phase · Day 22</div>
        <div className="cycle-theme">Soft Power</div>
        <div className="cycle-desc">You're in your luteal phase — the time of the wise woman. Your energy turns inward today. The veil between intuition and action thins. Trust what you already know.</div>
        <div className="intention">"I complete what I've started, with grace."</div>
      </div>

      <div className="two-col">
        <div>
          <div className="card">
            <div className="card-label" style={{ color: "var(--purple)" }}>Body Check-In</div>
            <div style={{ fontStyle: "italic", fontSize: 15, color: "var(--text-soft)", lineHeight: 1.7, marginTop: 6 }}>
              "Where do you feel heaviness today, and what does it need?"
            </div>
          </div>
          <div className="card">
            <div className="card-label" style={{ color: "var(--purple)" }}>Today's Intention</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "var(--accent-dark)", fontStyle: "italic", marginTop: 6, lineHeight: 1.5 }}>
              Finish what's already in motion.
            </div>
          </div>
          <div className="card">
            <div className="card-label" style={{ color: "var(--purple)" }}>Pattern Insight</div>
            <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6, marginTop: 6 }}>
              In your last 3 luteal phases, you've done your best writing in the mornings. You've shipped 2 Substack drafts and finalized 1 client proposal during this window. Protect your mornings today.
            </div>
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-label" style={{ color: "var(--purple)" }}>Phase-Aligned Meals</div>
            <div style={{ marginTop: 8 }}>
              {["Breakfast: Oatmeal with walnuts and banana", "Lunch: Lentil soup with crusty bread", "Dinner: Roasted salmon, sweet potato, greens"].map((m, i) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: i < 2 ? "1px solid var(--border)" : "none", fontSize: 13, color: "var(--text)" }}>{m}</div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-label" style={{ color: "var(--purple)" }}>Movement</div>
            <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6, marginTop: 6 }}>
              Gentle is the word today. Yin yoga, a slow walk, or light stretching. Your body is doing a lot internally — honor it with softness.
            </div>
          </div>
          <div className="card">
            <div className="card-label" style={{ color: "var(--purple)" }}>Spiritual Practice</div>
            <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6, marginTop: 6 }}>
              5 minutes of free writing before your first task. Light a candle. Ask: <em>"What do I know to be true right now?"</em>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── View: AGENTS ─────────────────────────────────────────────────────────────
function AgentsView() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-greeting">Agents</h1>
        <p className="page-subtitle">Your multi-agent operating system</p>
      </div>

      <div className="agents-grid" style={{ marginBottom: 20 }}>
        {AGENTS.map((a, i) => (
          <div className="agent-card" key={i}>
            <div className="agent-header">
              <div className="agent-name-row">
                <div className={`agent-dot dot-${a.status}`} />
                <div>
                  <div className="agent-name">{a.name}</div>
                  <div className="agent-role">{a.role}</div>
                </div>
              </div>
              <span className={`agent-status-badge status-${a.status}`}>
                {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
              </span>
            </div>
            <div className="agent-desc">{a.desc}</div>
            <div className="agent-last">Last active: {a.last}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-label">Mac Mini · Remote Control</div>
        <div className="card-subtitle">Wake and access your agent hub from anywhere</div>
        <div className="mac-mini-btns">
          <button className="btn-mac" onClick={() => alert("Sending Wake-on-LAN signal…\n\nSet MAC_MINI_TAILSCALE_IP and MAC_MINI_MAC_ADDRESS in Replit Secrets to activate.")}>
            <div className="btn-mac-icon">🌐</div>
            <span className="btn-mac-label">Wake Mac Mini</span>
            <div className="btn-mac-sub">Send WoL magic packet via Tailscale</div>
          </button>
          <button className="btn-mac" onClick={() => alert("Configure MAC_MINI_TAILSCALE_IP in Replit Secrets.")}>
            <div className="btn-mac-icon">🖥</div>
            <span className="btn-mac-label">Open Screen Share</span>
            <div className="btn-mac-sub">Remote session via Tailscale</div>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-label">Agent Activity</div>
        <div style={{ marginTop: 10 }}>
          {ACTIVITY_LOG.map((e, i) => (
            <div className="activity-entry" key={i}>
              <span className="activity-time">{e.time}</span>
              <span className="activity-dot" style={{ background: e.color }} />
              <span className="activity-text">{e.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const VIEWS: { id: View; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "clients", label: "Clients" },
  { id: "finance", label: "Finance" },
  { id: "intelligence", label: "Intelligence" },
  { id: "substack", label: "Substack" },
  { id: "spirit", label: "Spirit" },
  { id: "agents", label: "Agents" },
];

export default function Dashboard() {
  const [view, setView] = useState<View>("home");

  return (
    <div>
      <nav className="nav">
        <div className="nav-brand">Gabreal Command Center</div>
        <div className="nav-tabs">
          {VIEWS.map(v => (
            <button
              key={v.id}
              className={`nav-tab${view === v.id ? " active" : ""}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="nav-right">
          <SageChatWidget />
          <div className="nav-date">{formatDate()}</div>
        </div>
      </nav>

      <main className="main">
        {view === "home" && <HomeView />}
        {view === "clients" && <ClientsView />}
        {view === "finance" && <FinanceView />}
        {view === "intelligence" && <IntelligenceView />}
        {view === "substack" && <SubstackView />}
        {view === "spirit" && <SpiritView />}
        {view === "agents" && <AgentsView />}
      </main>
    </div>
  );
}
