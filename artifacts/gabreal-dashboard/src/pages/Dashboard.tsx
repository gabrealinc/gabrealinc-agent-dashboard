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

// ─── Types ────────────────────────────────────────────────────────────────────
type View = "home" | "clients" | "finance" | "intelligence" | "substack" | "spirit" | "agents";

// ─── Static mock data (real data comes from Supabase once keys are configured) ─
const SCHEDULE = [
  { time: "6:00 AM", event: "Morning Routine" },
  { time: "10:00 AM", event: "LACES Strategy Call" },
  { time: "2:30 PM", event: "Ryan Lands" },
  { time: "4:00 PM", event: "Luna Vita Check-in" },
];

const TASKS = [
  { id: 1, name: "Add Favicon to Luxx Site", date: "Jun 4", status: "To Do" },
  { id: 2, name: "Send Issa Dashboard", date: "Jun 4", status: "To Do" },
  { id: 3, name: "Luna Vita Brand Deck", date: "Jun 4", status: "In Progress" },
  { id: 4, name: "LACES Klaviyo Flow", date: "Jun 6", status: "In Progress" },
  { id: 5, name: "Create Labels for All Products", date: "Jun 11", status: "To Do" },
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
  { name: "Luna Vita", contact: "Kea Moran", type: "Brand Identity + Social", status: "Active", tags: ["Brand", "Social", "Strategy"] },
  { name: "LACES", contact: "Jeff Williams", type: "Email Marketing Strategy", status: "Active", tags: ["Email", "Klaviyo", "Campaigns"] },
  { name: "Luxx", contact: "Marcus Reid", type: "Website + Branding", status: "Active", tags: ["Web", "Brand"] },
  { name: "Issa Rae Media", contact: "Issa Rae", type: "Campaign Design", status: "Active", tags: ["Design", "Campaign"] },
  { name: "Bluebell", contact: "Sarah Chen", type: "Social Content", status: "Needs Attention", tags: ["Social", "Content"] },
];

const AGENTS = [
  { name: "Amber", role: "Communication Manager", status: "active", desc: "Monitors Gmail, Slack, and WhatsApp. Classifies, drafts replies, executes approved dashboard actions.", last: "12 minutes ago · 3 items in queue" },
  { name: "Mae", role: "System Librarian", status: "active", desc: "Audits Notion, cleans stale data, syncs file structure, ensures everything other agents read is accurate and current.", last: "45 minutes ago · All systems nominal" },
  { name: "Liala", role: "Spirit Team", status: "active", desc: "Daily morning ritual — cycle phase guidance, meals, movement, nervous system support, and spiritual practice.", last: "7:00 AM · Day 22 Luteal" },
  { name: "Nancy", role: "Research Analyst", status: "scheduled", desc: "Monitors client industries, AI developments, market trends, and business opportunities. Posts daily intelligence brief.", last: "7:30 AM · 3 items surfaced" },
  { name: "Milli", role: "Finance Watchdog", status: "scheduled", desc: "QuickBooks, Gusto, GHL, Stripe — monitors business and personal finances, flags overdue invoices and tax deadlines.", last: "7:45 AM · 1 flag: $5,000 pending" },
  { name: "Sage", role: "Executive Partner", status: "active", desc: "Morning standup, daily priorities, opportunity scan. Reads all other agent reports and delivers your 8am brief to Slack.", last: "8:02 AM · Brief delivered to Slack" },
  { name: "Milton", role: "Meeting Intelligence", status: "idle", desc: "Pulls from Granola, processes meeting transcripts, extracts action items, and proposes tasks to dashboard at 5pm.", last: "Yesterday 5:02 PM · 3 tasks proposed" },
  { name: "Lennard", role: "Legal / HR", status: "idle", desc: "Weekly legal, tax, and HR compliance check — CA filings, payroll, contracts, IRS deadlines. Runs Tuesdays.", last: "Tuesday · All clear" },
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

// ─── View: HOME ───────────────────────────────────────────────────────────────
function HomeView() {
  const [calOpen, setCalOpen] = useState(false);
  const closeCalendar = useCallback(() => setCalOpen(false), []);
  const [chatMessages, setChatMessages] = useState<{ role: "sage" | "user"; text: string }[]>([
    { role: "sage", text: "Good morning! You have 4 meetings today and 3 items in your queue. Your highest priority is the Luna Vita reply — Kea has been waiting since this morning." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }

  useEffect(() => { scrollToBottom(); }, [chatMessages]);

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
    <div>
      <div className="page-header">
        <h1 className="page-greeting">{getGreeting()}, Gabby.</h1>
      </div>

      <div className="home-grid">
        {/* LEFT */}
        <div>
          {/* Schedule */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-label">Today's Schedule</div>
              </div>
              <RefreshBtn />
            </div>
            {SCHEDULE.map((s, i) => (
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

          {/* Needs Attention */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-label">Needs Your Attention</div>
                <div className="card-subtitle" style={{ marginBottom: 0 }}>Proposals from Amber</div>
              </div>
              <RefreshBtn />
            </div>
            <div className="filter-pills" style={{ marginTop: 12 }}>
              <button className="pill active">All (2)</button>
              <button className="pill">Urgent (1)</button>
              <button className="pill">Action (1)</button>
            </div>

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

          {/* Sage Chat */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-label">Sage</div>
                <div className="card-subtitle" style={{ marginBottom: 0 }}>Ready to help.</div>
              </div>
            </div>
            <div className="sage-chat" style={{ marginTop: 12 }}>
              <div className="chat-messages" ref={messagesRef}>
                {chatMessages.map((m, i) => (
                  <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>
                ))}
                {sending && <div className="chat-msg sage" style={{ opacity: 0.6 }}>...</div>}
              </div>
              <div className="chat-input-row">
                <input
                  className="chat-input"
                  type="text"
                  placeholder="Ask Sage anything..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") sendChat(); }}
                />
                <button className="btn-send-chat" onClick={sendChat}>Send</button>
              </div>
              <div className="powered-by">Powered by Claude via Supabase</div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div>
          {/* Today's Priorities */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-label">Today's Priorities</div>
                <div className="card-subtitle" style={{ marginBottom: 0 }}>synced at {formatTime()}</div>
              </div>
              <RefreshBtn />
            </div>
            <div style={{ marginTop: 10 }}>
              {TASKS.map(t => (
                <div className="task-row" key={t.id}>
                  <div className="task-check" />
                  <div className="task-name">{t.name}</div>
                  <div className="task-date">{t.date}</div>
                  <StatusPill status={t.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Mac Mini */}
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

          {/* Liala Preview */}
          <div className="card" style={{ background: "linear-gradient(135deg, rgba(180,120,220,0.15), rgba(232,160,64,0.1))", cursor: "pointer" }}>
            <div className="card-label" style={{ color: "#9060C0" }}>Liala · Spirit Team</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 6, letterSpacing: "-0.3px" }}>Soft Power</div>
            <div style={{ fontSize: 13, color: "var(--text-soft)", fontStyle: "italic", lineHeight: 1.6 }}>You're in your luteal phase — the time of the wise woman. Your energy turns inward today. Finish what's already in motion.</div>
          </div>
        </div>
      </div>

      {calOpen && <CalendarModal onClose={closeCalendar} />}
    </div>
  );
}

// ─── View: CLIENTS ────────────────────────────────────────────────────────────
function ClientsView() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-greeting">Clients</h1>
        <p className="page-subtitle">Your active roster · synced from Notion</p>
      </div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="filter-pills">
          <button className="pill active">All ({CLIENTS.length})</button>
          <button className="pill">Active</button>
          <button className="pill">Needs Attention</button>
        </div>
        <button className="btn btn-accent">+ New Client</button>
      </div>
      {CLIENTS.map((c, i) => (
        <div className="client-card" key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <div className="client-name">{c.name}</div>
              <div className="client-meta">{c.contact} · {c.type}</div>
            </div>
            <span className={c.status === "Active" ? "status-paid" : "status-pending"}>{c.status}</span>
          </div>
          <div className="client-tags">
            {c.tags.map((t, j) => <span className="client-tag" key={j}>{t}</span>)}
          </div>
        </div>
      ))}
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
        <div className="nav-date">{formatDate()}</div>
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
