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
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeAgo(isoString: string | null): string {
  if (!isoString) return "never";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function weekStart(d: Date) { const r = new Date(d); const day = r.getDay(); r.setDate(r.getDate() - day + (day === 0 ? -6 : 1)); return r; }

// ─── Types ────────────────────────────────────────────────────────────────────
type View = "home" | "clients" | "finance" | "substack" | "agents";

type HealthStatus = "green" | "yellow" | "red" | "gray";
interface AgentHealth {
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
interface AgentHealthResponse {
  agents: AgentHealth[];
  checkedAt: string;
  cached: boolean;
  error?: string;
  message?: string;
}

// Empty unless the Google Calendar API returns real events.
const SCHEDULE_FALLBACK: { time: string; event: string }[] = [];

type Task = {
  id: number;
  notionId: string;
  name: string;
  date: string;       // display string e.g. "Jun 4"
  sortDate: string;   // ISO "2026-06-04" for sorting
  status: string;
  client: string;
  notes: string;
  notionUrl?: string;
  parentId?: string | null;
  subtasks?: Task[];
};

const TASKS_SEED: Task[] = [
  { id: 1, notionId: "3fea4fa7-7eaf-817f-bea8-eb52e98d816e", name: "Book cruise for Mom's clients", date: "Oct 19", sortDate: "2026-10-19", status: "To Do", client: "", notes: "Highest priority in Notion.", notionUrl: "https://app.notion.com/3fea4fa77eaf817fbea8eb52e98d816e" },
  { id: 2, notionId: "3dba4fa7-7eaf-8107-a469-caacf37d8938", name: "Build Your AI Operating System", date: "Sep 25", sortDate: "2026-09-25", status: "In Progress", client: "", notes: "High priority in Notion.", notionUrl: "https://app.notion.com/3dba4fa77eaf8107a469caacf37d8938" },
  { id: 3, notionId: "3f0a4fa7-7eaf-81e6-890a-e027a172c41d", name: "Prepare Midnight AI agents for Cody and Pamela", date: "Oct 9", sortDate: "2026-10-09", status: "On Hold", client: "", notes: "High priority and currently blocked in Notion.", notionUrl: "https://app.notion.com/3f0a4fa77eaf81e6890ae027a172c41d" },
  { id: 4, notionId: "3dba4fa7-7eaf-8158-9aa6-e59f6b09e8c2", name: "Publish LinkedIn launch post", date: "", sortDate: "9999-12-31", status: "To Do", client: "", notes: "High priority in Notion.", notionUrl: "https://app.notion.com/3dba4fa77eaf81589aa6e59f6b09e8c2" },
  { id: 5, notionId: "3f1a4fa7-7eaf-801b-8996-c6195f2a4bfb", name: "From Scratch Social Media Posts", date: "", sortDate: "9999-12-31", status: "Continuous", client: "", notes: "Highest priority continuous work in Notion.", notionUrl: "https://app.notion.com/3f1a4fa77eaf801b8996c6195f2a4bfb" },
];

const TASKS_NOTION_URL = "https://app.notion.com/p/222a4fa77eaf812b8707d4f1da02d778";

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

type ClientRecord = {
  name: string;
  status: string;
  priority: string;
  monthly: number;
  totalValue: number | null;
  currentEngagement: string;
  currentPriorities: string;
  waitingOn: string;
  commsPreference: string;
  website: string;
  lastUpdated: string;
  notionUrl: string;
};

const CLIENTS_NOTION_URL = "https://app.notion.com/p/222a4fa77eaf81478e38c6be0003d2e9";

const CLIENTS: ClientRecord[] = [
  { name: "Golden Era Sciences", status: "Active", priority: "Medium", monthly: 5000, totalValue: 100000, currentEngagement: "Gabby continues to manage the Golden Era Sciences website. Revenue-share terms may be revisited, but no percentage or structure is finalized.", currentPriorities: "Label production and delivery are complete. Website, favicon, and pixel work remain complete unless a new request arises.", waitingOn: "Dan owns payment-processor setup and testing.", commsPreference: "Text", website: "", lastUpdated: "Oct 9", notionUrl: "https://app.notion.com/304a4fa77eaf8076aa07c017a6ec5ddb" },
  { name: "Midnight Consulting Group", status: "Active", priority: "High", monthly: 1125, totalValue: null, currentEngagement: "$1,125 prepaid six-call AI strategy and advisory package, shared across Betsy, her team, and Chris. Four credits remain recorded.", currentPriorities: "Use the Meeting Credits document as the source of truth. Keep role-specific agent work input-gated and leave Outlook draft recipient fields blank.", waitingOn: "Gabby's interpretation of how Betsy's October 13 request should affect the remaining credit balance.", commsPreference: "Video Call", website: "https://midnightconsultinggroup.com/", lastUpdated: "Oct 15", notionUrl: "https://app.notion.com/397a4fa77eaf81ceaff2cfc59d6bd525" },
  { name: "Specialty Roll Products", status: "Proposal Sent", priority: "High", monthly: 0, totalValue: null, currentEngagement: "Proposal sent to the Specialty Roll Products leadership team.", currentPriorities: "No current action for Gabby.", waitingOn: "Leadership review and response.", commsPreference: "", website: "", lastUpdated: "Sep 29", notionUrl: "https://app.notion.com/3c2a4fa77eaf806f8d39e44af0de1058" },
  { name: "Luxx Wellness & Beauty", status: "Passive", priority: "Low", monthly: 200, totalValue: null, currentEngagement: "Passive recurring AI custom-product and GHL relationship at $200 per month. No active project is underway.", currentPriorities: "Maintain the existing portal and GHL relationship. New work requires a separately approved scope.", waitingOn: "Nothing. New project work begins only after a new request and approved scope.", commsPreference: "Text", website: "", lastUpdated: "Oct 3", notionUrl: "https://app.notion.com/225a4fa77eaf80548294e40747a47eac" },
  { name: "Aftermath Collective", status: "GHL", priority: "Low", monthly: 197, totalValue: 5000, currentEngagement: "Client delivery is complete. The site and GHL workflow project are finished and the $5,000 invoice has been sent.", currentPriorities: "No delivery work is pending. Monitor payment only.", waitingOn: "Payment of the sent $5,000 invoice.", commsPreference: "Text", website: "", lastUpdated: "Oct 3", notionUrl: "https://app.notion.com/284a4fa77eaf80368068f88e6710eef9" },
  { name: "Elevate With Kait", status: "GHL", priority: "Low", monthly: 50, totalValue: null, currentEngagement: "Passive monthly GoHighLevel client. No active project is underway.", currentPriorities: "Normal passive GHL maintenance. The nervous-system guide is exploratory only until scope, ownership, and economics are agreed.", waitingOn: "A decision on whether the guide becomes a scoped project.", commsPreference: "Text", website: "", lastUpdated: "Oct 15", notionUrl: "https://app.notion.com/30ca4fa77eaf8021a1f1dd9b04e36438" },
  { name: "Inspirit Alchemy", status: "GHL", priority: "Low", monthly: 75, totalValue: null, currentEngagement: "Passive monthly GoHighLevel client. The hosting, support, and referral agreement has been sent.", currentPriorities: "Normal passive GHL account maintenance only.", waitingOn: "Grace to sign the agreement after travel. No follow-up is required unless she raises a question.", commsPreference: "Text", website: "", lastUpdated: "Sep 29", notionUrl: "https://app.notion.com/30ca4fa77eaf8098ae91e1d463ee7722" },
  { name: "Kea Kiehl", status: "GHL", priority: "Low", monthly: 197, totalValue: 3725, currentEngagement: "$197 per month GHL support continues. A $3,500 My Spirit Oasis and Luna Vita website proposal was sent October 7 and is not yet accepted.", currentPriorities: "Await the website proposal decision and payment preference. Google Workspace migration and SMS notification troubleshooting remain documented.", waitingOn: "Kea's proposal decision, migration follow-up, and SMS troubleshooting results.", commsPreference: "Email", website: "", lastUpdated: "Oct 12", notionUrl: "https://app.notion.com/375a4fa77eaf81b8abefc8221e98b147" },
  { name: "Let's Go Travel with Mary", status: "GHL", priority: "Low", monthly: 0, totalValue: null, currentEngagement: "No current engagement details are recorded in Notion.", currentPriorities: "No current priorities are recorded in Notion.", waitingOn: "Nothing recorded.", commsPreference: "Phone Call", website: "", lastUpdated: "Sep 25", notionUrl: "https://app.notion.com/30ca4fa77eaf800bbbc2d6c14296247e" },
];

type AgentActivity = { time: string; label: string; note: string; tag: "URGENT" | "ACTION" | "FYI" | "DONE" | "FLAG" };
type Agent = {
  name: string; role: string; status: "active" | "scheduled" | "idle";
  desc: string; last: string;
  notionUrl?: string;
  report: { summary: string; items: AgentActivity[] };
};

const AGENTS: Agent[] = [
  {
    name: "Amber", role: "Communication Manager", status: "active",
    desc: "Latest verified communication report from Notion.",
    last: "Oct 16 · Complete",
    notionUrl: "https://app.notion.com/3fba4fa77eaf81868b03d276564ad907",
    report: {
      summary: "Four clean runs. At 3:50 PM, four open items were unchanged, two newsletter threads and one promo thread were filed, and nothing was sent or created.",
      items: [{ time: "Oct 16", label: "Amber · 2026-10-16 06:33 PT", note: "Latest verified Notion report. Status: Complete.", tag: "DONE" }],
    },
  },
  {
    name: "Mae", role: "System Librarian", status: "active",
    desc: "Latest verified weekly work log from Notion.",
    last: "Oct 12–16 · Complete",
    notionUrl: "https://app.notion.com/3fba4fa77eaf815d97e7ef26166631e4",
    report: {
      summary: "Midnight's new six-call package is active and Christopher Mello accepted a recurring AI Sync, but the credit ledger needs confirmation before Monday's call and the agent-build blocker remains open.",
      items: [{ time: "Oct 12–16", label: "Midnight Consulting Group Weekly Work Log", note: "Latest verified Notion report. Status: Complete.", tag: "DONE" }],
    },
  },
  {
    name: "Elle", role: "Life + Business Alignment", status: "idle",
    desc: "Latest verified daily alignment report from Notion.",
    last: "Oct 11 · Latest available",
    notionUrl: "https://app.notion.com/3f6a4fa77eaf81d2b550e7d03c70b4a9",
    report: {
      summary: "Keep Sunday open for family, rest, or more raw writing if it feels good. Count 'I Already Know What I Want' as progress and leave AI course Module 1 and client maintenance for next week.",
      items: [{ time: "Oct 11", label: "Elle · Daily Alignment", note: "Latest verified Notion report. No later report was found.", tag: "FYI" }],
    },
  },
  {
    name: "Nancy", role: "Research Analyst", status: "scheduled",
    desc: "Latest verified research intelligence report from Notion.",
    last: "Oct 15 · Complete",
    notionUrl: "https://app.notion.com/3faa4fa77eaf81a4ae18dc2b5137091f",
    report: {
      summary: "Pew's new online-community data and recent studies show rising interest in trusted human voices, hands-on hobbies, and hybrid digital-to-in-person connection alongside AI adoption.",
      items: [{ time: "Oct 15", label: "Nancy · Daily Research & Intelligence", note: "Latest verified Notion report. Status: Complete.", tag: "DONE" }],
    },
  },
  {
    name: "Peggy", role: "Executive Partner", status: "active",
    desc: "Latest verified Peggy report from Notion.",
    last: "Oct 19 · Evening Closeout · Complete",
    notionUrl: "https://app.notion.com/p/3ffa4fa77eaf81e38054c5dbfd675d7a?pvs=204",
    report: {
      summary: "Peggy's complete October 19 evening closeout is available to read.",
      items: [
        { time: "Oct 19", label: "Build the course", note: "Start with Module 1 and make the course tangible.", tag: "ACTION" },
        { time: "Oct 19", label: "Reply to Chris", note: "Reschedule the AI sync and reconcile the remaining meeting credit.", tag: "URGENT" },
        { time: "Oct 19", label: "Confirm the cruise task", note: "Verify whether the booking task is still open.", tag: "FLAG" },
      ],
    },
  },
  {
    name: "Milton", role: "Meeting Intelligence", status: "idle",
    desc: "Latest verified daily log from Notion.",
    last: "Oct 13 · Partial",
    notionUrl: "https://app.notion.com/3f8a4fa77eaf81d8bb4ee0bc8b2ae7c8",
    report: {
      summary: "Required Yesenia meeting QA writes remain blocked. Midnight approved work is waiting on source inputs, and the checkpoint is unchanged.",
      items: [{ time: "Oct 13", label: "Milton · Daily Log", note: "Latest verified Notion report. Status: Partial.", tag: "FLAG" }],
    },
  },
  {
    name: "Olivia", role: "Client Health", status: "idle",
    desc: "Latest verified client health report from Notion.",
    last: "Sep 25 · Partial",
    notionUrl: "https://app.notion.com/3e6a4fa77eaf8181869ad5b78660ee5f",
    report: {
      summary: "The client health review was completed, but the report body write was blocked and the workflow checkpoint was not advanced.",
      items: [{ time: "Sep 25", label: "Olivia · Client Health Review", note: "Latest verified Notion report. Status: Partial.", tag: "FLAG" }],
    },
  },
];

const ACTIVITY_LOG = [
  { time: "Oct 19", color: "#60C070", text: <><strong>Peggy</strong> · Evening Closeout complete in Notion</> },
  { time: "Oct 16", color: "#60C070", text: <><strong>Amber</strong> · Four communication runs complete</> },
  { time: "Oct 15", color: "#60C070", text: <><strong>Nancy</strong> · Research intelligence report complete</> },
  { time: "Oct 13", color: "#E8C040", text: <><strong>Milton</strong> · Meeting QA work remains blocked</> },
];

const SUBSTACK_POSTS = [
  { id: 1, title: "The Soft Power Issue", status: "In Progress", date: "Jun 8", subtitle: "What no one tells you about leading from rest", body: "There's a particular kind of exhaustion that comes not from doing too much, but from performing strength for too long.\n\nWe talk about hustle culture, but what about the quieter pressure — the one that says you should be further along, more certain, more visible by now?\n\nThis issue is about the other kind of power. The kind that doesn't announce itself." },
  { id: 2, title: "On Raising Rates", status: "Ready", date: "Jun 1", subtitle: "A guide for creative entrepreneurs who undercharge", body: "Your time is worth more than you think. Here's how to prove it to yourself first." },
  { id: 3, title: "AI Won't Replace You", status: "Published", date: "May 20", subtitle: "But it will replace the version of you that doesn't use it", body: "The creatives winning right now are not the ones ignoring AI. They're the ones who figured out how to stay human inside it." },
  { id: 4, title: "Brand Before Strategy", status: "Idea", date: "May 10", subtitle: "", body: "" },
];

// ─── API helpers ──────────────────────────────────────────────────────────────
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data?.message || data?.error || "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(detail ? `API ${path} -> ${res.status}: ${detail}` : `API ${path} -> ${res.status}`);
  }
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
const TASK_STATUS_OPTIONS = ["On Deck", "To Do", "In Progress", "On Hold", "Done"] as const;
const DONE_STATUSES = new Set(["done", "complete", "completed", "resolved", "closed", "archived", "dismissed", "filed"]);

function isActiveTaskStatus(status: string) {
  return !DONE_STATUSES.has(status.toLowerCase().trim());
}

function pillClass(status: string) {
  if (status === "On Deck")     return "pill-ondeck";
  if (status === "In Progress") return "pill-progress";
  if (status === "On Hold")     return "pill-hold";
  return "pill-todo";
}

function PrioritiesPanel({ tasks = [], setTasks, loading, liveSync }: {
  tasks?: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  loading: boolean;
  liveSync: boolean;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [syncing, setSyncing] = useState<Record<number, "status" | "date" | null>>({});
  const [syncError, setSyncError] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [localDoneIds, setLocalDoneIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(window.localStorage.getItem("dashboard-completed-tasks") ?? "[]")); }
    catch { return new Set(); }
  });

  const allActive = tasks.filter(t => isActiveTaskStatus(t.status) && !localDoneIds.has(t.notionId));

  // Build parent→children map so subtasks nest under their parent
  const taskByNotionId = new Map(allActive.map(t => [t.notionId, t]));
  const childrenMap = new Map<string, Task[]>();
  const roots: Task[] = [];
  for (const t of allActive) {
    if (t.parentId && taskByNotionId.has(t.parentId)) {
      const list = childrenMap.get(t.parentId) ?? [];
      list.push(t);
      childrenMap.set(t.parentId, list);
    } else {
      roots.push(t);
    }
  }
  const visible = roots.slice(0, 7).map(t => ({ ...t, subtasks: childrenMap.get(t.notionId) ?? [] }));

  async function patchNotion(task: Task, body: object) {
    if (!task.notionId || task.notionId.startsWith("task-")) return;
    await apiFetch(`/notion/tasks/${task.notionId}`, { method: "PATCH", body: JSON.stringify(body) });
  }

  async function changeStatus(task: Task, next: string, e?: React.SyntheticEvent) {
    e?.stopPropagation();
    if (task.status === next) return;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t));
    if (next === "Done") {
      setLocalDoneIds(prev => {
        const updated = new Set(prev).add(task.notionId);
        window.localStorage.setItem("dashboard-completed-tasks", JSON.stringify([...updated]));
        return updated;
      });
      setExpanded(null);
    }
    setSyncing(prev => ({ ...prev, [task.id]: "status" }));
    setSyncError(null);
    if (!liveSync) {
      setNotice(next === "Done" ? "Marked done on this dashboard. Notion live sync still needs reconnecting." : "Updated on this dashboard. Notion live sync still needs reconnecting.");
      setSyncing(prev => ({ ...prev, [task.id]: null }));
      return;
    }
    try {
      await patchNotion(task, { status: next });
      setNotice(next === "Done" ? "Completed and saved to Notion." : "Status saved to Notion.");
    } catch {
      setSyncError(task.id);
      setTimeout(() => setSyncError(null), 2500);
    } finally {
      setSyncing(prev => ({ ...prev, [task.id]: null }));
    }
  }

  async function changeDate(task: Task, isoDate: string) {
    const display = isoDate
      ? new Date(isoDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "";
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, sortDate: isoDate, date: display } : t));
    setSyncing(prev => ({ ...prev, [task.id]: "date" }));
    setSyncError(null);
    try {
      await patchNotion(task, { dueDate: isoDate });
    } catch {
      setSyncError(task.id);
      setTimeout(() => setSyncError(null), 2500);
    } finally {
      setSyncing(prev => ({ ...prev, [task.id]: null }));
    }
  }

  return (
    <>
      {notice && <div className="task-panel-notice">{notice}</div>}
      {loading && (
        <div style={{ fontSize: 12, color: "var(--text-xsoft)", padding: "4px 0 8px" }}>Syncing from Notion…</div>
      )}
      {!loading && visible.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--text-xsoft)", padding: "12px 0", fontStyle: "italic" }}>
          Nothing active right now.
        </div>
      )}
      {visible.map(t => {
        const isSyncing = syncing[t.id];
        const hasSubtasks = (t.subtasks?.length ?? 0) > 0;
        return (
          <div key={t.id}>
            <div
              className={`task-row task-row-clickable ${expanded === t.id ? "task-row-open" : ""}`}
              onClick={() => setExpanded(prev => prev === t.id ? null : t.id)}
            >
              <div className="task-name">
                {t.name}
                {hasSubtasks && (
                  <span className="subtask-count">{t.subtasks!.length}</span>
                )}
              </div>
              <div className="task-date">{t.date}</div>
              <select
                className={`task-status-select ${pillClass(t.status)} ${isSyncing ? "pill-syncing" : ""}`}
                value={t.status}
                aria-label={`Update status for ${t.name}`}
                disabled={!!isSyncing}
                onClick={e => e.stopPropagation()}
                onChange={e => changeStatus(t, e.target.value, e)}
              >
                {TASK_STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                {!TASK_STATUS_OPTIONS.includes(t.status as typeof TASK_STATUS_OPTIONS[number]) && <option value={t.status}>{t.status}</option>}
              </select>
              <span className={`task-expand-arrow ${expanded === t.id ? "open" : ""}`}>›</span>
            </div>

            {expanded === t.id && (
              <div className="task-detail" onClick={e => e.stopPropagation()}>
                {syncError === t.id && (
                  <div className="task-sync-error">⚠ Notion sync failed — update saved locally</div>
                )}

                {/* Client */}
                {t.client && (
                  <div className="task-detail-row">
                    <span className="task-detail-label">Client</span>
                    <span className="task-detail-value">{t.client}</span>
                  </div>
                )}

                {/* Editable due date */}
                <div className="task-detail-row">
                  <span className="task-detail-label">Due date</span>
                  <input
                    type="date"
                    value={t.sortDate !== "9999-12-31" ? t.sortDate : ""}
                    onChange={e => changeDate(t, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "3px 8px",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: "var(--text)",
                      background: "var(--surface)",
                      cursor: "pointer",
                    }}
                  />
                  {isSyncing === "date" && (
                    <span style={{ fontSize: 11, color: "var(--text-xsoft)", marginLeft: 6 }}>saving…</span>
                  )}
                </div>

                {/* Notes */}
                {t.notes && (
                  <div className="task-detail-row task-detail-notes">
                    <span className="task-detail-label">Notes</span>
                    <span className="task-detail-value">{t.notes}</span>
                  </div>
                )}

                {/* Editable status */}
                <div className="task-detail-row" style={{ alignItems: "flex-start", flexDirection: "column", gap: 6 }}>
                  <span className="task-detail-label">Status</span>
                  <div className="task-status-row" style={{ marginTop: 0 }}>
                    {TASK_STATUS_OPTIONS.map(s => (
                      <button
                        key={s}
                        className={`task-status-option ${t.status === s ? "active" : ""}`}
                        onClick={e => changeStatus(t, s, e)}
                        disabled={!!isSyncing}
                      >
                        {t.status === s && isSyncing === "status" ? "…" : s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subtasks */}
                {hasSubtasks && (
                  <div className="subtask-list">
                    {t.subtasks!.map(sub => (
                      <div key={sub.id} className="subtask-row">
                        <span className="subtask-bullet">›</span>
                        <span className="subtask-name">{sub.name}</span>
                        <span className={`task-status-pill ${pillClass(sub.status)}`} style={{ fontSize: 10, padding: "2px 8px" }}>
                          {sub.status}
                        </span>
                        {sub.date && <span className="task-date">{sub.date}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Open in Notion */}
                {t.notionUrl && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 6 }}>
                    <a
                      href={t.notionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ccv2-action-btn"
                      style={{ fontSize: 11, textDecoration: "none", display: "inline-block" }}
                    >
                      Open in Notion ↗
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ─── Types: Comms ─────────────────────────────────────────────────────────────
type CommItem = {
  id: string;
  notionUrl: string;
  summary: string;
  priority: string;   // "HIGH" | "URGENT" | "TASK" | "FYI" | ""
  source: string;
  client: string;
  status: string;
  context: string;
  draftReply: string;
  email?: string;
  sourceUrl?: string;
  action: string;
  relativeTime: string;
};

type CommAction = "save_draft" | "ready_to_send" | "done" | "file" | "dismiss" | "delete";

const COMMS_MOCK: CommItem[] = [
  {
    id: "snapshot-scheduler-reliability",
    notionUrl: "https://app.notion.com/p/3fba4fa77eaf81bea463e3b527a8aaa4?pvs=204",
    summary: "The Oct 10 scheduler fix for Elle, Nancy, and Olivia did not hold, and Milton is separately blocked since Oct 6",
    priority: "HIGH", source: "Notion", client: "Agent system", status: "Open",
    context: "Latest verified Needs Attention item. Elle, Nancy, Olivia, and Milton have missing, stale, or blocked reporting runs.",
    draftReply: "", action: "Review", relativeTime: "Latest Notion snapshot",
  },
];

// ─── View: HOME ───────────────────────────────────────────────────────────────
function DailyReportCard({ fullPage = false, onOpenFullReport }: { fullPage?: boolean; onOpenFullReport?: () => void }) {
  return (
    <div className={`card daily-report-card${fullPage ? " daily-report-card-full" : ""}`}>
      <div className="card-header daily-report-card-header">
        <div>
          <div className="card-label">Peggy's Latest Report</div>
          <div className="card-subtitle" style={{ marginBottom: 0 }}>Peggy · Evening Closeout · Oct 19 · Complete</div>
        </div>
        {onOpenFullReport && (
          <button className="daily-report-full" type="button" onClick={onOpenFullReport}>Read full report</button>
        )}
      </div>
    </div>
  );
}

function HomeView() {
  const [calOpen, setCalOpen] = useState(false);
  const closeCalendar = useCallback(() => setCalOpen(false), []);
  const [agentQuickView, setAgentQuickView] = useState<Agent | null>(() =>
    AGENTS.find(agent => agent.name === "Peggy") ?? null
  );
  const [schedule, setSchedule] = useState<{ time: string; event: string }[]>(SCHEDULE_FALLBACK);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [comms, setComms] = useState<CommItem[]>(COMMS_MOCK);
  const [commsLoading, setCommsLoading] = useState(true);
  const [commsFromNotion, setCommsFromNotion] = useState(false);
  const [commsError, setCommsError] = useState("");
  const [commsFilter, setCommsFilter] = useState<"all" | "urgent" | "action" | "fyi">("all");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [learningNotes, setLearningNotes] = useState<Record<string, string>>({});
  const [commActionStatus, setCommActionStatus] = useState<Record<string, string>>({});
  const [actingOnComm, setActingOnComm] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // ── Tasks (shared by PrioritiesPanel and QuickStats) ──────────────────────
  const [tasks, setTasks] = useState<Task[]>([...TASKS_SEED]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState("");
  const [tasksNotionDbUrl, setTasksNotionDbUrl] = useState(TASKS_NOTION_URL);
  const [tasksLiveSync, setTasksLiveSync] = useState(false);

  async function loadTasks() {
    setTasksLoading(true);
    setTasksError("");
    try {
      const data = await apiFetch<{ tasks: Task[]; notionDbUrl?: string }>("/notion/tasks");
      // Always replace with Notion data (empty = nothing active, show empty state)
      setTasks((data.tasks ?? []).sort((a, b) => a.sortDate.localeCompare(b.sortDate)));
      if (data.notionDbUrl) setTasksNotionDbUrl(data.notionDbUrl);
      setTasksLiveSync(true);
    } catch {
      // Keep the latest verified Notion snapshot visible when live sync is unavailable.
      setTasksError("");
      setTasksLiveSync(false);
    } finally {
      setTasksLoading(false);
    }
  }

  async function loadSchedule() {
    setScheduleLoading(true);
    try {
      const data = await apiFetch<{ events: { timeDisplay: string; title: string }[] }>("/gcal/events?days=1");
      if (data.events?.length) {
        setSchedule(data.events.map(e => ({ time: e.timeDisplay, event: e.title })));
      } else {
        setSchedule([]);
      }
    } catch {
      setSchedule([]);
    } finally {
      setScheduleLoading(false);
    }
  }

  async function loadComms() {
    setCommsLoading(true);
    setCommsError("");
    try {
      const data = await apiFetch<{ items: CommItem[] }>("/notion/comms");
      // Always replace with Notion data — empty array means all clear
      setComms(data.items ?? []);
      setCommsFromNotion(true);
    } catch {
      // Keep the saved attention items available until Notion is reconnected.
      setCommsError("");
    } finally {
      setCommsLoading(false);
    }
  }

  async function dismissComm(id: string) {
    setDismissed(prev => new Set([...prev, id]));
    if (!id.startsWith("snapshot-")) {
      try { await apiFetch(`/notion/comms/${id}/dismiss`, { method: "POST" }); } catch { /* best-effort */ }
    }
  }

  async function handleCommAction(item: CommItem, action: CommAction) {
    const draftReply = drafts[item.id] ?? item.draftReply ?? "";
    const learningNote = learningNotes[item.id] ?? "";
    const resolvesItem = ["done", "file", "dismiss", "delete"].includes(action);
    const localMessage: Record<CommAction, string> = {
      save_draft: "Draft saved to Notion.",
      ready_to_send: "Marked ready to send in Notion.",
      done: "Marked complete in Notion.",
      file: "Filed in Notion.",
      dismiss: "Dismissed in Notion.",
      delete: "Archived in Notion.",
    };

    setActingOnComm(prev => new Set([...prev, item.id]));
    setCommActionStatus(prev => ({ ...prev, [item.id]: "Saving to Notion..." }));

    if (item.id.startsWith("snapshot-")) {
      setCommActionStatus(prev => ({ ...prev, [item.id]: "This is a verified Notion snapshot. Open the source report to update it." }));
      if (resolvesItem) setDismissed(prev => new Set([...prev, item.id]));
      setActingOnComm(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      return;
    }

    try {
      await apiFetch(`/notion/comms/${item.id}/action`, {
        method: "POST",
        body: JSON.stringify({
          action,
          draftReply,
          learningNote,
          itemSummary: item.summary,
          client: item.client,
          source: item.source,
          email: item.email,
        }),
      });
      setCommActionStatus(prev => ({ ...prev, [item.id]: localMessage[action] }));
      if (resolvesItem) setDismissed(prev => new Set([...prev, item.id]));
    } catch {
      setCommActionStatus(prev => ({ ...prev, [item.id]: "Not saved. Open in Notion if this keeps happening." }));
    } finally {
      setActingOnComm(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  useEffect(() => { loadSchedule(); loadComms(); loadTasks(); }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-greeting">{getGreeting()}, Gabby.</h1>
      </div>

      <div className="home-grid home-grid-three" style={{ alignItems: "stretch" }}>
        <DailyReportCard onOpenFullReport={() => setAgentQuickView(AGENTS.find(agent => agent.name === "Peggy") ?? AGENTS[0])} />

        {/* Calendar */}
        <div>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-label">Today's Schedule</div>
              </div>
              <RefreshBtn onClick={loadSchedule} />
            </div>
            <div className="home-grid-scroll">
              {scheduleLoading && (
                <div style={{ fontSize: 12, color: "var(--text-xsoft)", padding: "4px 0 8px" }}>Loading from Google Calendar…</div>
              )}
              {!scheduleLoading && schedule.length === 0 && (
                <div style={{ fontSize: 12, color: "var(--text-xsoft)", padding: "12px 0", lineHeight: 1.55 }}>
                  No live calendar events are available. Nothing made up is shown here.
                </div>
              )}
              {schedule.map((s, i) => (
                <div className="schedule-item" key={i}>
                  <span className="schedule-time">{s.time}</span>
                  <span className="schedule-name">{s.event}</span>
                </div>
              ))}
            </div>
            <button
              className="card-link"
              style={{ background: "none", border: "none", padding: "10px 0 0", cursor: "pointer", textAlign: "left", flexShrink: 0 }}
              onClick={() => setCalOpen(true)}
            >
              View full calendar →
            </button>
          </div>
        </div>

        {/* Priorities */}
        <div>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-label">
                  This Week's Priorities
                  {tasksNotionDbUrl && (
                    <a href={tasksNotionDbUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", fontWeight: 500, marginLeft: 8 }}>
                      Open in Notion ↗
                    </a>
                  )}
                </div>
                <div className="card-subtitle" style={{ marginBottom: 0 }}>
                  {tasksLoading
                    ? "checking Notion…"
                    : tasksLiveSync
                      ? `${tasks.filter(t => isActiveTaskStatus(t.status)).length} active · live from Notion`
                      : `${tasks.filter(t => isActiveTaskStatus(t.status)).length} priorities · latest Notion snapshot`}
                </div>
              </div>
              <RefreshBtn onClick={loadTasks} />
            </div>
            <div className="home-grid-scroll">
              {tasksError && (
                <div className="error-banner" style={{ marginBottom: 10 }}>{tasksError}</div>
              )}
              <PrioritiesPanel tasks={tasks} setTasks={setTasks} loading={tasksLoading} liveSync={tasksLiveSync} />
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Needs Attention — live from Notion Comms Log */}
      {(() => {
        const visible = comms.filter(c => !dismissed.has(c.id));
        const urgent  = visible.filter(c => ["HIGH","URGENT"].includes(c.priority));
        const action  = visible.filter(c => ["TASK","ACTION","APPROVE"].includes(c.priority) && !["HIGH","URGENT"].includes(c.priority));
        const fyi     = visible.filter(c => c.priority === "FYI");
        const filtered = commsFilter === "urgent" ? urgent
                       : commsFilter === "action" ? action
                       : commsFilter === "fyi"    ? fyi
                       : visible;

        function priorityBadgeClass(p: string) {
          if (["HIGH","URGENT"].includes(p)) return "badge badge-high";
          if (["TASK","ACTION","APPROVE"].includes(p)) return "badge badge-task";
          if (p === "FYI") return "badge badge-fyi";
          return "badge";
        }

        return (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header">
              <div>
                <div className="card-label">Needs Your Attention</div>
                <div className="card-subtitle" style={{ marginBottom: 0 }}>
                  {commsLoading
                    ? "Syncing from Notion Comms Log…"
                    : commsFromNotion
                      ? visible.length === 0
                        ? `All clear · synced at ${formatTime()}`
                        : `${visible.length} outstanding · synced at ${formatTime()}`
                      : `${visible.length} item${visible.length !== 1 ? "s" : ""}`}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="filter-pills" style={{ margin: 0 }}>
                  <button className={`pill${commsFilter === "all" ? " active" : ""}`} onClick={() => setCommsFilter("all")}>All ({visible.length})</button>
                  {urgent.length > 0 && <button className={`pill${commsFilter === "urgent" ? " active" : ""}`} onClick={() => setCommsFilter("urgent")}>Urgent ({urgent.length})</button>}
                  {action.length > 0 && <button className={`pill${commsFilter === "action" ? " active" : ""}`} onClick={() => setCommsFilter("action")}>Action ({action.length})</button>}
                  {fyi.length > 0 && <button className={`pill${commsFilter === "fyi" ? " active" : ""}`} onClick={() => setCommsFilter("fyi")}>FYI ({fyi.length})</button>}
                </div>
                <RefreshBtn onClick={loadComms} />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-xsoft)", fontFamily: "Inter, sans-serif", fontSize: 14, lineHeight: 1.6 }}>
                {commsError
                  ? <span style={{ color: "#B04040" }}>{commsError}</span>
                  : commsLoading
                  ? "Loading…"
                  : commsFromNotion
                    ? <>✓ Nothing needs your attention right now.</>
                    : "All clear — nothing needs your attention right now."}
              </div>
            ) : (
              <div className="attention-grid">
                {filtered.map(item => {
                  const draft = drafts[item.id] ?? item.draftReply;
                  const learningNote = learningNotes[item.id] ?? "";
                  const isActing = actingOnComm.has(item.id);
                  const actionMessage = commActionStatus[item.id];
                  return (
                    <div key={item.id} className="attention-card">
                      <div className="attention-meta">
                        {item.priority && <span className={priorityBadgeClass(item.priority)}>{item.priority}</span>}
                        {item.source   && <span className="badge badge-source">{item.source}</span>}
                        {item.client   && <span className="badge badge-client">{item.client}</span>}
                        {item.email    && <span className="badge badge-source">{item.email}</span>}
                        {item.relativeTime && <span className="badge-time">{item.relativeTime}</span>}
                      </div>
                      <div className="attention-summary">{item.summary}</div>
                      {item.context && <div className="attention-why">{item.context}</div>}
                      {item.sourceUrl && (
                        <a className="card-link" href={item.sourceUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginBottom: 10 }}>
                          Open source →
                        </a>
                      )}
                      {draft && (
                        <>
                          <div className="draft-label">Draft Reply</div>
                          <textarea
                            className="draft-textarea"
                            value={draft}
                            onChange={e => setDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                          />
                        </>
                      )}
                      <div className="draft-label">Teach the system</div>
                      <textarea
                        className="draft-textarea"
                        value={learningNote}
                        placeholder="Example: this is the client's main email, file these unless pricing changes, reply warmly but keep it short..."
                        onChange={e => setLearningNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                        style={{ minHeight: 54 }}
                      />
                      <div className="action-btns">
                        {draft && (
                          <>
                            <button className="btn btn-send" disabled={isActing} onClick={() => handleCommAction(item, "save_draft")}>Save Draft</button>
                            <button className="btn btn-approve" disabled={isActing} onClick={() => handleCommAction(item, "ready_to_send")}>Ready to Send</button>
                          </>
                        )}
                        <button className="btn btn-approve" disabled={isActing} onClick={() => handleCommAction(item, "done")}>Mark Done</button>
                        <button className="btn btn-dismiss" disabled={isActing} onClick={() => handleCommAction(item, "file")}>File</button>
                        <button className="btn btn-dismiss" disabled={isActing} onClick={() => handleCommAction(item, "dismiss")}>I don't need this</button>
                        <button className="btn btn-dismiss" disabled={isActing} onClick={() => handleCommAction(item, "delete")}>Delete from Queue</button>
                        {item.notionUrl && item.notionUrl !== "#" && (
                          <a className="btn btn-approve" href={item.notionUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>Open in Notion ↗</a>
                        )}
                      </div>
                      {actionMessage && (
                        <div style={{
                          marginTop: 8,
                          fontSize: 12,
                          color: actionMessage.startsWith("Not saved") ? "#B04040" : "var(--text-soft)",
                          fontFamily: "Inter, sans-serif",
                        }}>
                          {actionMessage}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {false && <>
      {/* ── Quick Stats ── Tasks + Invoices ───────────────────── */}
      {(() => {
        const today = new Date();
        const todayISO = isoDate(today);
        const weekEnd = isoDate(addDays(weekStart(today), 6));
        const monthStr = today.toLocaleString("en-US", { month: "short" }); // "Jun"

        // Only count active tasks — server strips Done/Completed from Notion response
        const overdue  = tasks.filter(t => t.sortDate !== "9999-12-31" && t.sortDate < todayISO).length;
        const dueToday = tasks.filter(t => t.sortDate === todayISO).length;
        const dueWeek  = tasks.filter(t => t.sortDate > todayISO && t.sortDate <= weekEnd).length;
        const dueMonth = tasks.filter(t => t.sortDate !== "9999-12-31" && t.sortDate.startsWith(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`)).length;
        const undated  = tasks.filter(t => t.sortDate === "9999-12-31").length;

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
                  {undated > 0 && (
                    <div className="qs-item" style={{ opacity: 0.6 }}>
                      <span className="qs-num">{undated}</span>
                      <span className="qs-label">No date set</span>
                    </div>
                  )}
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

      {/* Full-width Elle */}
      <div className="card" style={{ cursor: "pointer" }}>
        <div className="card-label" style={{ color: "#9060C0" }}>Elle · Highest Self + Wellness</div>
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
      </>}

      {calOpen && <CalendarModal onClose={closeCalendar} />}
      {agentQuickView && (agentQuickView.name === "Peggy" ? (
        <PeggyDailyReportModal onClose={() => setAgentQuickView(null)} />
      ) : (
        <AgentQuickView agent={agentQuickView} onClose={() => setAgentQuickView(null)} />
      ))}
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

function PeggyDailyReportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="aqv-overlay" onClick={onClose}>
      <div className="aqv-panel peggy-report-modal" onClick={event => event.stopPropagation()}>
        <div className="aqv-header peggy-report-header">
          <div>
            <div className="peggy-report-eyebrow">Latest verified Notion report</div>
            <div className="aqv-name">Peggy · Evening Closeout</div>
            <div className="aqv-role">Monday, October 19, 2026 · Complete</div>
          </div>
          <button className="aqv-close" onClick={onClose} aria-label="Minimize Peggy's report">✕</button>
        </div>

        <div className="peggy-report-scroll">
          <section className="peggy-report-section">
            <div className="aqv-section-label">Today in Review</div>
            <div className="peggy-priority-list">
              <div><span>1</span><p><strong>Midnight team session.</strong>The 67-minute working session produced an Inbox Manager. Office 365 permissions and testing are still required.</p></div>
              <div><span>2</span><p><strong>Session recap.</strong>The recap was emailed at 1:25 PM, and Pamela replied positively.</p></div>
              <div><span>3</span><p><strong>Family emails.</strong>Messages went to Shahira and Lynne, and Shahira acknowledged hers.</p></div>
            </div>
          </section>

          <section className="peggy-report-section">
            <div className="aqv-section-label">What Moved</div>
            <div className="peggy-priority-list">
              <div><span>1</span><p><strong>Hands-on education feels energizing.</strong>The team session reinforced that selective, engaged teaching is work you enjoy.</p></div>
              <div><span>2</span><p><strong>The meeting-manager model sharpened.</strong>A shared model for managing meetings became clearer.</p></div>
              <div><span>3</span><p><strong>Creative direction developed.</strong>You explored Archie's visual direction and the independent-thinking essay.</p></div>
            </div>
          </section>

          <section className="peggy-report-section">
            <div className="aqv-section-label">Still Open</div>
            <div className="peggy-priority-list">
              <div><span>1</span><p><strong>Course production.</strong>All eight modules remain in progress. Module 1 is the entry point, and the September 25 date in Notion is stale.</p></div>
              <div><span>2</span><p><strong>Midnight status.</strong>The recap was sent. Any future work should remain separate and unapproved until scope is confirmed.</p></div>
              <div><span>3</span><p><strong>Meeting credit.</strong>Billing appears to show one credit remaining because Chris rescheduled.</p></div>
              <div><span>4</span><p><strong>Other open work.</strong>The cruise booking is unverified, and several writing tasks appear stale.</p></div>
            </div>
          </section>

          <section className="peggy-report-section">
            <div className="aqv-section-label">Waiting On</div>
            <p>Midnight is waiting on Office 365 authorization, testing, and client-success requirements. Kea's proposal decision and payment are also still pending.</p>
          </section>

          <section className="peggy-report-section">
            <div className="aqv-section-label">Needs Attention</div>
            <div className="peggy-priority-list">
              <div><span>1</span><p><strong>Reschedule Chris.</strong>Find a Wednesday or Thursday time and reconcile the remaining credit.</p></div>
              <div><span>2</span><p><strong>Lovable deletion notice.</strong>The deletion window is 30 days.</p></div>
              <div><span>3</span><p><strong>Keep Midnight scope clear.</strong>Proposed additions remain pending until they are approved.</p></div>
              <div><span>4</span><p><strong>Notion AI credits.</strong>The change begins November 2 and does not need action today.</p></div>
            </div>
          </section>

          <section className="peggy-report-section">
            <div className="aqv-section-label">Tomorrow's Handoff</div>
            <div className="peggy-priority-list">
              <div><span>1</span><p><strong>Morning course writing.</strong>Make the course tangible by starting Module 1.</p></div>
              <div><span>2</span><p><strong>Reply to Chris.</strong>Reschedule the session and reconcile the credit.</p></div>
              <div><span>3</span><p><strong>Confirm the cruise task.</strong>Verify whether it is still open.</p></div>
            </div>
          </section>

          <section className="peggy-report-section peggy-report-bottom-line">
            <div className="aqv-section-label">The Close</div>
            <p>Today's evidence says engaged team teaching gives you energy. The next move is to make the course tangible instead of redesigning the business again.</p>
            <a href="https://app.notion.com/p/3ffa4fa77eaf81e38054c5dbfd675d7a?pvs=204" target="_blank" rel="noreferrer" className="card-link">Open the source report in Notion ↗</a>
          </section>
        </div>

        <div className="aqv-footer peggy-report-footer">
          <span className="aqv-footer-hint">Peggy · October 19 · Complete</span>
          <button type="button" className="peggy-minimize" onClick={onClose}>Close report</button>
        </div>
      </div>
    </div>
  );
}

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
            <div className="modal-sub">Creates a new page in your Notion CRM · powered by Dave</div>
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
  const [filter, setFilter] = useState<"all" | "Active" | "Proposal Sent" | "Passive" | "GHL">("all");
  const [clients, setClients] = useState(CLIENTS);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsFromNotion, setClientsFromNotion] = useState(false);
  const [notionDbUrl, setNotionDbUrl] = useState<string>(CLIENTS_NOTION_URL);
  const dbId = import.meta.env.VITE_NOTION_CLIENTS_DB_ID;

  async function loadClients() {
    setClientsLoading(true);
    try {
      const url = dbId ? `/notion/clients?db=${encodeURIComponent(dbId)}` : "/notion/clients";
      const data = await apiFetch<{ clients: ClientRecord[]; notionDbUrl?: string }>(url);
      setClients(data.clients ?? []);
      setClientsFromNotion(true);
      if (data.notionDbUrl) setNotionDbUrl(data.notionDbUrl);
    } catch {
      // Keep the latest verified Notion snapshot visible.
    } finally {
      setClientsLoading(false);
    }
  }

  useEffect(() => { loadClients(); }, []);

  const filtered = filter === "all" ? clients : clients.filter(c => c.status === filter);
  const activeClients = clients.filter(c => c.status === "Active");
  const monthlyRevenue = clients.reduce((sum, client) => sum + client.monthly, 0);
  const waitingCount = clients.filter(client => client.waitingOn && !client.waitingOn.toLowerCase().startsWith("nothing")).length;
  const proposalCount = clients.filter(client => client.status === "Proposal Sent").length;

  const AVATAR_COLORS = ["#E8A040", "#9060C0", "#60A878", "#C06060", "#4080C0"];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-greeting">Clients</h1>
          <p className="page-subtitle" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {clientsLoading
              ? "Syncing from Notion…"
              : clientsFromNotion
                ? `${clients.length} client${clients.length !== 1 ? "s" : ""} · synced from Notion`
                : `${clients.length} verified client records · latest Notion snapshot`}
            {notionDbUrl && !clientsLoading && (
              <a href={notionDbUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>
                Open in Notion ↗
              </a>
            )}
          </p>
        </div>
        <button className="ccv2-action-btn" onClick={loadClients} disabled={clientsLoading} style={{ alignSelf: "flex-start" }}>
          {clientsLoading ? "Refreshing…" : "↺ Refresh"}
        </button>
      </div>

      {/* Summary stats */}
      <div className="four-col" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Active Clients</div>
          <div className="stat-value">{activeClients.length}</div>
          <div className="stat-sub">{clients.length} total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly Recorded</div>
          <div className="stat-value">${monthlyRevenue.toLocaleString()}</div>
          <div className="stat-sub">Across these Notion records</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Waiting On</div>
          <div className="stat-value">{waitingCount}</div>
          <div className="stat-sub">Records with an open dependency</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Proposals Out</div>
          <div className="stat-value">{proposalCount}</div>
          <div className="stat-sub">Awaiting a decision</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div className="filter-pills">
          {(["all", "Active", "Proposal Sent", "Passive", "GHL"] as const).map(f => (
            <button key={f} className={`pill ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
              {f === "all" ? `All (${clients.length})` : `${f} (${clients.filter(c => c.status === f).length})`}
            </button>
          ))}
        </div>
        <a className="btn btn-accent" href={CLIENTS_NOTION_URL} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>Open Clients in Notion ↗</a>
      </div>

      {/* Client cards */}
      {filtered.length === 0 && !clientsLoading && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-xsoft)", fontFamily: "Inter, sans-serif", fontSize: 14, lineHeight: 1.6 }}>
          {clientsFromNotion
            ? filter === "all"
              ? "No clients found in your Notion database."
              : `No clients with status "${filter}".`
            : "No clients to display."}
        </div>
      )}
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
                <div className="ccv2-contact">Priority: {c.priority || "Not set"} · Updated {c.lastUpdated}</div>
              </div>
              <div className="ccv2-header-right">
                <span className={`client-status-badge ${badgeClass}`}>{c.status}</span>
                <div className="ccv2-value">
                  ${c.monthly.toLocaleString()}
                  <span className="ccv2-value-label">/mo recorded</span>
                </div>
              </div>
            </div>

            <div className="ccv2-details">
              <div className="ccv2-detail-item">
                <span className="ccv2-detail-label">Current Engagement</span>
                <span className="ccv2-detail-val">{c.currentEngagement || "Not recorded in Notion."}</span>
              </div>
              <div className="ccv2-detail-item">
                <span className="ccv2-detail-label">Current Priorities</span>
                <span className="ccv2-detail-val">{c.currentPriorities || "Not recorded in Notion."}</span>
              </div>
              <div className="ccv2-detail-item">
                <span className="ccv2-detail-label">Waiting On</span>
                <span className="ccv2-detail-val">{c.waitingOn || "Nothing recorded."}</span>
              </div>
              <div className="ccv2-detail-item">
                <span className="ccv2-detail-label">Communication</span>
                <span className="ccv2-detail-val">{c.commsPreference || "Not recorded"}</span>
              </div>
            </div>

            <div className="ccv2-footer">
              <div className="client-tags">
                {c.totalValue != null && <span className="client-tag">Total value: ${c.totalValue.toLocaleString()}</span>}
                {c.website && <a className="client-tag" href={c.website} target="_blank" rel="noreferrer">Website ↗</a>}
              </div>
              <div className="ccv2-actions">
                <button className="ccv2-action-btn" onClick={() => window.open(c.notionUrl, "_blank")}>Open in Notion ↗</button>
              </div>
            </div>
          </div>
        );
      })}
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
        <p className="page-subtitle">Revenue, invoices, and financial health · powered by Dave</p>
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

// ─── View: WRITING CORNER ─────────────────────────────────────────────────────
type SubstackPost = { id: string | number; title: string; subtitle: string; status: string; date: string; body: string; tags: string[]; notionUrl?: string };

function WritingCornerView() {
  const [posts, setPosts] = useState<SubstackPost[]>(SUBSTACK_POSTS.map(p => ({ ...p, id: String(p.id), tags: [], notionUrl: "" })));
  const [selected, setSelected] = useState<SubstackPost>(posts[0]);
  const [loading, setLoading] = useState(true);
  const [notionDbUrl, setNotionDbUrl] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [writingTime, setWritingTime] = useState(false);
  const writingBodyRef = useRef<HTMLTextAreaElement>(null);
  const lastSavedRef = useRef("");

  // Sync editor fields when selected post changes
  useEffect(() => {
    if (selected) {
      setEditTitle(selected.title ?? "");
      setEditSubtitle(selected.subtitle ?? "");
      setEditBody(selected.body ?? "");
      setSaveMsg("");
      lastSavedRef.current = JSON.stringify([selected.title ?? "", selected.subtitle ?? "", selected.body ?? ""]);
    }
  }, [selected?.id]);

  async function handleSavePost(newStatus?: string) {
    if (!selected) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const body: any = { title: editTitle, subtitle: editSubtitle, body: editBody };
      if (newStatus) body.status = newStatus;
      const BASE = (import.meta as any).env?.BASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${BASE}/api/notion/substack/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      // Update local post state
      const updatedStatus = newStatus ?? selected.status;
      setPosts(prev => prev.map(p => p.id === selected.id
        ? { ...p, title: editTitle, subtitle: editSubtitle, body: editBody, status: updatedStatus }
        : p
      ));
      setSelected(prev => prev ? { ...prev, title: editTitle, subtitle: editSubtitle, body: editBody, status: updatedStatus } : prev);
      setSaveMsg(newStatus === "Published" ? "✓ Published to Notion" : "✓ Draft saved");
      lastSavedRef.current = JSON.stringify([editTitle, editSubtitle, editBody]);
    } catch (err: any) {
      setSaveMsg("⚠ " + (err.message ?? "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  const statusColors: Record<string, string> = {
    "In Progress": "pill-progress",
    "Ready": "pill-done",
    "Published": "status-paid",
    "Idea": "pill-todo",
    "Draft": "pill-todo",
  };

  async function loadPosts() {
    setLoading(true);
    try {
      const data = await apiFetch<{ posts: SubstackPost[]; notionDbUrl?: string }>("/notion/substack");
      if (data.posts?.length) {
        setPosts(data.posts);
        setSelected(data.posts[0]);
      }
      if (data.notionDbUrl) setNotionDbUrl(data.notionDbUrl);
    } catch {
      // keep seed data
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPosts(); }, []);

  useEffect(() => {
    if (!writingTime || !selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => writingBodyRef.current?.focus(), 0);
    const leaveOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) {
        document.querySelector<HTMLButtonElement>(".writing-time-leave")?.click();
      }
    };
    const leaveWhenFullscreenCloses = () => {
      if (!document.fullscreenElement) {
        const snapshot = JSON.stringify([editTitle, editSubtitle, editBody]);
        if (snapshot !== lastSavedRef.current) void handleSavePost();
        setWritingTime(false);
      }
    };
    window.addEventListener("keydown", leaveOnEscape);
    document.addEventListener("fullscreenchange", leaveWhenFullscreenCloses);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", leaveOnEscape);
      document.removeEventListener("fullscreenchange", leaveWhenFullscreenCloses);
    };
  }, [writingTime, selected?.id, editTitle, editSubtitle, editBody]);

  useEffect(() => {
    if (!writingTime || !selected) return;
    const snapshot = JSON.stringify([editTitle, editSubtitle, editBody]);
    if (snapshot === lastSavedRef.current) return;
    setSaveMsg("Saving after you pause...");
    const timer = window.setTimeout(() => { void handleSavePost(); }, 1800);
    return () => window.clearTimeout(timer);
  }, [writingTime, selected?.id, editTitle, editSubtitle, editBody]);

  const statuses = ["All", ...Array.from(new Set(posts.map(p => p.status)))];
  const filtered = statusFilter === "All" ? posts : posts.filter(p => p.status === statusFilter);
  const wordCount = editBody.trim() ? editBody.trim().split(/\s+/).length : 0;

  async function enterWritingMode() {
    setWritingTime(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // The fixed overlay is the fallback when browser fullscreen is unavailable.
    }
  }

  async function leaveWritingMode() {
    const snapshot = JSON.stringify([editTitle, editSubtitle, editBody]);
    if (snapshot !== lastSavedRef.current) await handleSavePost();
    setWritingTime(false);
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    }
  }

  return (
    <div>
      {writingTime && selected && (
        <div className="writing-time-overlay" role="dialog" aria-modal="true" aria-label="Writing Corner">
          <header className="writing-time-header">
            <div className="writing-time-brand">Writing Corner</div>
            <div className="writing-time-header-actions">
              <span>{saving ? "Saving..." : saveMsg || "Saved to Notion"}</span>
              <button className="writing-time-leave" onClick={() => { void leaveWritingMode(); }}>Exit writing mode</button>
            </div>
          </header>
          <main className="writing-time-main">
            <p className="writing-time-kicker">A quiet place for the thought you are following</p>
            <input className="writing-time-title" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Untitled piece" aria-label="Post title" />
            <input className="writing-time-subtitle" value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)} placeholder="A subtitle, if it needs one" aria-label="Post subtitle" />
            <textarea ref={writingBodyRef} className="writing-time-body" value={editBody} onChange={e => setEditBody(e.target.value)} placeholder="Start wherever you are..." aria-label="Post body" />
            <footer className="writing-time-footer">
              <span>{wordCount} {wordCount === 1 ? "word" : "words"}</span>
              <span>Press Escape to return to the dashboard</span>
            </footer>
          </main>
          <div className="writing-time-plant" aria-hidden="true"><i/><i/><i/><i/><b/></div>
        </div>
      )}
      <div className="page-header">
        <div>
          <h1 className="page-greeting">Writing Corner</h1>
          <p className="page-subtitle" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            Your private place to write, edit, and prepare work for publication
            {notionDbUrl && (
              <a href={notionDbUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
                Open in Notion ↗
              </a>
            )}
            {loading && <span style={{ fontSize: 11, color: "var(--text-xsoft)" }}>syncing…</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="writing-time-enter" onClick={() => { void enterWritingMode(); }} disabled={!selected}>Full-screen writing mode</button>
          <button className="ccv2-action-btn" onClick={loadPosts} disabled={loading} style={{ alignSelf: "flex-start" }}>
            {loading ? "Refreshing…" : "↺ Refresh"}
          </button>
        </div>
      </div>
      <div className="substack-layout">
        <div className="post-list">
          <div className="post-list-header">
            <span style={{ fontWeight: 600, fontSize: 14 }}>Posts ({filtered.length})</span>
            {selected?.notionUrl && (
              <a href={selected.notionUrl} target="_blank" rel="noopener noreferrer"
                className="ccv2-action-btn" style={{ fontSize: 11, textDecoration: "none" }}>
                Open ↗
              </a>
            )}
          </div>
          <div className="filter-pills" style={{ padding: "10px 14px 0", flexWrap: "wrap", gap: 4 }}>
            {statuses.map(s => (
              <button key={s} className={`pill ${statusFilter === s ? "active" : ""}`} style={{ fontSize: 11 }} onClick={() => setStatusFilter(s)}>{s}</button>
            ))}
          </div>
          {filtered.map(p => (
            <div key={p.id} className={`post-item ${selected?.id === p.id ? "selected" : ""}`} onClick={() => setSelected(p)}>
              <div className="post-item-title">{p.title}</div>
              <div className="post-item-meta">
                <span className={statusColors[p.status] || "pill-todo"} style={{ fontSize: 10, padding: "2px 8px" }}>{p.status}</span>
                <span style={{ fontSize: 11, color: "var(--text-xsoft)" }}>{p.date}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="editor-panel">
          {selected ? (
            <>
              <div className="editor-focus-row"><span>Drafting in Notion</span><button onClick={() => { void enterWritingMode(); }}>Enter writing mode</button></div>
              <input className="editor-title" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Post title..." />
              <input className="editor-subtitle" value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)} placeholder="Subtitle..." />
              <div className="editor-toolbar">
                {["B", "I", "H2", "Link", "Quote", "Bullets", "Numbers", "Image"].map(t => (
                  <button className="toolbar-btn" key={t}>{t}</button>
                ))}
              </div>
              <textarea className="editor-body" value={editBody} onChange={e => setEditBody(e.target.value)} placeholder="Start writing..." />
              <div className="editor-actions">
                <button className="btn btn-accent" disabled={saving} onClick={() => handleSavePost("Published")}>
                  {saving ? "Saving…" : "Publish"}
                </button>
                <button className="btn btn-approve" disabled={saving} onClick={() => handleSavePost("Scheduled")}>Schedule</button>
                <button className="btn btn-dismiss" disabled={saving} onClick={() => handleSavePost()}>
                  {saving ? "Saving…" : "Save Draft"}
                </button>
                {selected.notionUrl && (
                  <a href={selected.notionUrl} target="_blank" rel="noopener noreferrer"
                    className="btn" style={{ fontSize: 12, textDecoration: "none", background: "var(--bg-soft)", color: "var(--text-soft)", border: "1px solid var(--border)" }}>
                    Edit in Notion ↗
                  </a>
                )}
              </div>
              {saveMsg && (
                <div style={{ fontSize: 12, padding: "4px 0", color: saveMsg.startsWith("⚠") ? "#c0522a" : "#4a7c59", fontFamily: "Inter, sans-serif" }}>
                  {saveMsg}
                </div>
              )}
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-xsoft)", fontSize: 14 }}>
              Select a post to edit
            </div>
          )}
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
const HEALTH_DOT: Record<HealthStatus, string> = {
  green:  "#4CAF6B",
  yellow: "#D4A017",
  red:    "#C0522A",
  gray:   "#B0A090",
};
const HEALTH_LABEL: Record<HealthStatus, string> = {
  green:  "On track",
  yellow: "Overdue",
  red:    "Late",
  gray:   "Inactive",
};

function AgentHealthCard({ a }: { a: AgentHealth }) {
  return (
    <div className="agent-card" style={{
      borderLeft: `3px solid ${HEALTH_DOT[a.healthStatus]}`,
      position: "relative",
    }}>
      <div className="agent-header">
        <div className="agent-name-row">
          <div style={{
            width: 10, height: 10, borderRadius: "50%", flexShrink: 0, marginTop: 2,
            background: HEALTH_DOT[a.healthStatus],
            boxShadow: a.healthStatus === "red" ? `0 0 6px ${HEALTH_DOT.red}88` : undefined,
          }} />
          <div>
            <div className="agent-name">{a.name}</div>
            <div className="agent-role">{a.role}</div>
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
          background: `${HEALTH_DOT[a.healthStatus]}22`,
          color: HEALTH_DOT[a.healthStatus],
          fontFamily: "Inter, sans-serif",
        }}>
          {HEALTH_LABEL[a.healthStatus]}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-soft)", fontFamily: "Inter, sans-serif", marginTop: 6 }}>
        {a.overdueBy
          ? <span style={{ color: HEALTH_DOT[a.healthStatus], fontWeight: 600 }}>{a.overdueBy}</span>
          : null}
        {a.overdueBy && a.lastReportAt ? " · " : null}
        {a.lastReportAt
          ? `Last report ${timeAgo(a.lastReportAt)}`
          : a.rosterStatus === "Active" ? "No reports found" : a.rosterStatus}
      </div>
      {a.lastReportTitle && (
        <div style={{ fontSize: 11, color: "var(--text-xsoft)", marginTop: 4, fontFamily: "Inter, sans-serif", fontStyle: "italic" }}>
          {a.lastReportTitle}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: "var(--text-xsoft)", fontFamily: "Inter, sans-serif", background: "var(--bg-soft)", padding: "2px 7px", borderRadius: 8 }}>
          {a.cadence}{a.expectedTime ? ` · ${a.expectedTime}` : ""}
        </span>
        {a.lastReportUrl && (
          <a
            href={a.lastReportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ccv2-action-btn"
            style={{ fontSize: 10, textDecoration: "none" }}
          >
            Latest report ↗
          </a>
        )}
      </div>
    </div>
  );
}

function AgentsView() {
  const recentReports = ["Peggy", "Amber", "Mae", "Nancy", "Milton", "Elle", "Olivia"]
    .map(name => AGENTS.find(agent => agent.name === name))
    .filter((agent): agent is Agent => Boolean(agent));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-greeting">Agent Reports</h1>
          <p className="page-subtitle">The latest verified report available from each agent in Notion.</p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {recentReports.map(agent => (
          <article className="card" key={agent.name} style={{ marginBottom: 0 }}>
            <div className="card-header" style={{ alignItems: "flex-start", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span className={`agent-dot dot-${agent.status}`} />
                  <strong style={{ fontSize: 17 }}>{agent.name}</strong>
                  <span style={{ color: "var(--text-xsoft)", fontSize: 12 }}>{agent.role}</span>
                </div>
                <div className="card-subtitle" style={{ margin: 0 }}>{agent.last}</div>
              </div>
              {agent.notionUrl && (
                <a className="ccv2-action-btn" href={agent.notionUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", flexShrink: 0 }}>
                  Open report in Notion ↗
                </a>
              )}
            </div>
            <p style={{ color: "var(--text-soft)", fontSize: 14, lineHeight: 1.65, margin: "8px 0 12px" }}>{agent.report.summary}</p>
            <div style={{ display: "grid", gap: 7 }}>
              {agent.report.items.map((item, index) => (
                <div key={`${agent.name}-${index}`} style={{ background: "var(--surface-warm)", borderRadius: 9, padding: "9px 11px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.5 }}>{item.note}</div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const VIEWS: { id: View; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "clients", label: "Clients" },
  { id: "finance", label: "Finance" },
  { id: "substack", label: "Writing" },
  { id: "agents", label: "Agents" },
];

function RelaxingMode({ onClose }: { onClose: () => void }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relaxing-mode" role="dialog" aria-modal="true" aria-label="Relaxing mode">
      <div className="relaxing-water" aria-hidden="true" />

      <div className="relaxing-center">
        <time className="relaxing-time" dateTime={now.toISOString()}>
          {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </time>
        <div className="relaxing-date">
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>

      <button className="relaxing-exit" type="button" onClick={onClose} aria-label="Exit relaxing mode">
        Exit relaxing mode
      </button>
    </div>
  );
}

export default function Dashboard() {
  const [view, setView] = useState<View>("home");
  const [relaxing, setRelaxing] = useState(false);

  // ── Agent health — fetched at Dashboard level so banner spans all tabs ──────
  const [healthData, setHealthData]           = useState<AgentHealth[]>([]);
  const [healthCheckedAt, setHealthCheckedAt] = useState<string | null>(null);
  const [healthLoading, setHealthLoading]     = useState(false);
  const [healthError, setHealthError]         = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await apiFetch<AgentHealthResponse>("/agent-health");
      if (res.error) {
        setHealthError(res.error);
      } else {
        setHealthData(res.agents ?? []);
        setHealthCheckedAt(res.checkedAt ?? null);
        setHealthError(null);
      }
    } catch {
      setHealthError("fetch_failed");
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  useEffect(() => {
    if (!relaxing) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRelaxing(false);
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setRelaxing(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [relaxing]);

  const enterRelaxingMode = async () => {
    setRelaxing(true);
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    } catch {
      // The calm screen still works when a browser blocks native fullscreen.
    }
  };

  const exitRelaxingMode = async () => {
    setRelaxing(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // Closing the overlay is enough if the browser handles fullscreen itself.
    }
  };

  const redAgents = healthData.filter(a => a.healthStatus === "red");

  return (
    <div>
      <nav className="nav">
        <div className="nav-top">
          <div className="nav-brand">Gab Real Inc</div>
          <div className="nav-top-right">
            <div className="nav-date">{formatDate()}</div>
            <button className="relax-button" type="button" onClick={enterRelaxingMode}>
              Relax
            </button>
          </div>
        </div>
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
      </nav>

      {redAgents.length > 0 && (
        <div style={{
          background: "#C0522A",
          color: "#fff",
          padding: "8px 20px",
          fontSize: 13,
          fontFamily: "Inter, sans-serif",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}>
          <span>⚠️</span>
          {redAgents.map((a, i) => (
            <span key={a.name}>
              <strong>{a.name}</strong> has not reported
              {a.overdueBy && a.overdueBy !== "no report found" ? ` in ${a.overdueBy.replace(" overdue", "")}` : " — no report found"}
              {i < redAgents.length - 1 ? " · " : ""}
            </span>
          ))}
          <button
            onClick={() => setView("agents")}
            style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, padding: "3px 10px", cursor: "pointer", fontFamily: "Inter, sans-serif" }}
          >
            View →
          </button>
        </div>
      )}

      <main className="main">
        {view === "home"         && <HomeView />}
        {view === "clients"      && <ClientsView />}
        {view === "finance"      && <FinanceView />}
        {view === "substack"     && <WritingCornerView />}
        {view === "agents"       && <AgentsView />}
      </main>

      {relaxing && <RelaxingMode onClose={exitRelaxingMode} />}
    </div>
  );
}
