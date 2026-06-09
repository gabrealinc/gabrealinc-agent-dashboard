// ─────────────────────────────────────────────────────────────────────────────
// GAB REAL INC OPERATING SYSTEM — Dashboard Components
// Paste into your Lovable project (dashboard.gabrealinc.com)
//
// INCLUDES:
//   1. TaskPriorities  — inline status editing, syncs to Notion
//   2. EmailActionCards — Amber's flagged emails, edit draft, send via Gmail
//
// SETUP (one-time):
//   1. In Supabase → Edge Functions, deploy the functions in supabase-edge-functions.md
//   2. Add NOTION_API_KEY + NOTION_COMMS_LOG_DB to Supabase secrets
//   3. Drop <TaskPriorities /> and <EmailActionCards /> into your dashboard layout
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

// ─── BRAND TOKENS ─────────────────────────────────────────────────────────────
const BRAND = {
  bg: "#0F0F0F",
  surface: "#1A1A1A",
  surfaceHover: "#222222",
  border: "#2A2A2A",
  accent: "#C8B59A",       // warm sand
  accentSoft: "#C8B59A22",
  text: "#F0EBE3",
  textMuted: "#888",
  urgent: "#E05555",
  urgentSoft: "#E0555520",
  action: "#D4A843",
  actionSoft: "#D4A84320",
  fyi: "#5B8FD4",
  fyiSoft: "#5B8FD420",
  done: "#4CAF82",
  doneSoft: "#4CAF8220",
};

const STATUS_OPTIONS = [
  "Not Started",
  "In Progress",
  "Waiting",
  "Blocked",
  "Done",
  "Archived",
];

const STATUS_COLORS = {
  "Not Started":  { bg: "#2A2A2A",       text: "#888" },
  "In Progress":  { bg: "#D4A84320",     text: "#D4A843" },
  "Waiting":      { bg: "#5B8FD420",     text: "#5B8FD4" },
  "Blocked":      { bg: "#E0555520",     text: "#E05555" },
  "Done":         { bg: "#4CAF8220",     text: "#4CAF82" },
  "Archived":     { bg: "#33333350",     text: "#666" },
};

const PRIORITY_COLORS = {
  high:   { bg: "#E0555520", text: "#E05555", label: "HIGH" },
  medium: { bg: "#D4A84320", text: "#D4A843", label: "MED" },
  low:    { bg: "#2A2A2A",   text: "#888",    label: "LOW" },
};


// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT 1: TASK PRIORITIES
// Pulls from Notion Tasks DB. Inline status editing. Syncs back to Notion.
// ═════════════════════════════════════════════════════════════════════════════

export function TaskPriorities() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState({});  // taskId → new status
  const [saving, setSaving] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [error, setError] = useState(null);

  // ── Fetch tasks from Notion via Supabase edge function ──
  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notion-tasks"); // Supabase edge function
      if (!res.ok) throw new Error("Failed to load tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
      setLastSynced(new Date());
    } catch (e) {
      setError("Could not load tasks. Check Notion connection.");
    } finally {
      setLoading(false);
    }
  }

  function markChanged(taskId, newStatus) {
    setPendingUpdates(prev => ({ ...prev, [taskId]: newStatus }));
    // Optimistically update local display
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    );
  }

  // ── Save all pending changes to Notion ──
  async function saveAll() {
    if (Object.keys(pendingUpdates).length === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(pendingUpdates).map(([taskId, status]) =>
          fetch("/api/update-notion-task", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId, status }),
          })
        )
      );
      setPendingUpdates({});
      setLastSynced(new Date());
    } catch (e) {
      setError("Save failed. Changes are still shown locally.");
    } finally {
      setSaving(false);
    }
  }

  const hasPending = Object.keys(pendingUpdates).length > 0;
  const activeTasks = tasks.filter(t => t.status !== "Done" && t.status !== "Archived");

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.cardHeader}>
        <div>
          <h2 style={styles.cardTitle}>TOP PRIORITIES</h2>
          {lastSynced && (
            <span style={styles.syncTime}>
              synced {lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {hasPending && (
            <span style={styles.pendingBadge}>
              {Object.keys(pendingUpdates).length} unsaved
            </span>
          )}
          {hasPending && (
            <button
              onClick={saveAll}
              disabled={saving}
              style={{ ...styles.btn, ...styles.btnAccent }}
            >
              {saving ? "Saving..." : "Save to Notion"}
            </button>
          )}
          <button onClick={fetchTasks} style={styles.btnGhost} title="Refresh">
            ↻
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Loading */}
      {loading && (
        <div style={styles.loadingRow}>
          <div style={styles.skeleton} />
          <div style={{ ...styles.skeleton, width: "70%" }} />
          <div style={{ ...styles.skeleton, width: "85%" }} />
        </div>
      )}

      {/* Task List */}
      {!loading && activeTasks.length === 0 && (
        <div style={styles.emptyState}>
          Nothing due today. Go enjoy your life.
        </div>
      )}

      {!loading && activeTasks.map((task, i) => (
        <TaskRow
          key={task.id}
          task={task}
          isPending={!!pendingUpdates[task.id]}
          onChange={(newStatus) => markChanged(task.id, newStatus)}
        />
      ))}
    </div>
  );
}

function TaskRow({ task, isPending, onChange }) {
  const [open, setOpen] = useState(false);
  const statusStyle = STATUS_COLORS[task.status] || STATUS_COLORS["Not Started"];
  const priorityStyle = PRIORITY_COLORS[task.priority?.toLowerCase()] || PRIORITY_COLORS.medium;

  return (
    <div
      style={{
        ...styles.taskRow,
        borderLeft: isPending ? `3px solid ${BRAND.accent}` : `3px solid transparent`,
        background: isPending ? BRAND.accentSoft : "transparent",
      }}
    >
      {/* Left col: name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.taskName}>{task.name}</div>
        <div style={styles.taskMeta}>
          {task.project && <span style={styles.tag}>{task.project}</span>}
          {task.dueDate && (
            <span style={{
              ...styles.tag,
              color: isOverdue(task.dueDate) ? BRAND.urgent : BRAND.textMuted,
              background: isOverdue(task.dueDate) ? BRAND.urgentSoft : "transparent",
            }}>
              {formatDate(task.dueDate)}
            </span>
          )}
          {isPending && (
            <span style={{ ...styles.tag, color: BRAND.accent }}>● unsaved</span>
          )}
        </div>
      </div>

      {/* Right col: priority badge + status selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <span style={{ ...styles.priorityBadge, background: priorityStyle.bg, color: priorityStyle.text }}>
          {priorityStyle.label}
        </span>

        {/* Inline status dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setOpen(!open)}
            style={{
              ...styles.statusPill,
              background: statusStyle.bg,
              color: statusStyle.text,
            }}
          >
            {task.status} ▾
          </button>

          {open && (
            <div style={styles.dropdown}>
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => { onChange(s); setOpen(false); }}
                  style={{
                    ...styles.dropdownItem,
                    color: (STATUS_COLORS[s] || {}).text || BRAND.text,
                    background: task.status === s ? BRAND.surfaceHover : "transparent",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// COMPONENT 2: EMAIL ACTION CARDS
// Reads Amber's flagged emails from Comms Log. Open in Gmail + edit draft + send.
// ═════════════════════════════════════════════════════════════════════════════

export function EmailActionCards() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | urgent | action | gmail | slack
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEmails();
  }, []);

  async function fetchEmails() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/amber-emails"); // reads from Comms Log DB
      if (!res.ok) throw new Error("Failed to load emails");
      const data = await res.json();
      setEmails(data.emails || []);
    } catch (e) {
      setError("Could not load items from Amber.");
    } finally {
      setLoading(false);
    }
  }

  async function markResolved(itemId, resolution = "resolved") {
    setEmails(prev => prev.filter(e => e.id !== itemId));
    await fetch("/api/resolve-comms-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, resolution }),
    }).catch(() => {}); // optimistic — already removed from UI
  }

  const filtered = emails.filter(e => {
    if (filter === "urgent") return e.category === "URGENT";
    if (filter === "action") return e.category === "ACTION NEEDED";
    if (filter === "gmail") return e.sourceType === "Gmail";
    if (filter === "slack") return e.sourceType === "Slack";
    return true;
  });

  const urgentCount = emails.filter(e => e.category === "URGENT").length;
  const actionCount = emails.filter(e => e.category === "ACTION NEEDED").length;
  const gmailCount = emails.filter(e => e.sourceType === "Gmail").length;
  const slackCount = emails.filter(e => e.sourceType === "Slack").length;

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.cardHeader}>
        <div>
          <h2 style={styles.cardTitle}>NEEDS YOUR ATTENTION</h2>
          <span style={styles.syncTime}>Proposals from Amber</span>
        </div>
        <button onClick={fetchEmails} style={styles.btnGhost} title="Refresh">↻</button>
      </div>

      {/* Filter pills */}
      <div style={styles.filterRow}>
        {[
          { key: "all",    label: `All (${emails.length})` },
          { key: "urgent", label: `Urgent (${urgentCount})`, color: BRAND.urgent },
          { key: "action", label: `Action (${actionCount})`, color: BRAND.action },
          { key: "gmail",  label: `Gmail (${gmailCount})`, color: BRAND.fyi },
          { key: "slack",  label: `Slack (${slackCount})`, color: BRAND.accent },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              ...styles.filterPill,
              background: filter === f.key ? (f.color || BRAND.accent) + "22" : "transparent",
              color: filter === f.key ? (f.color || BRAND.accent) : BRAND.textMuted,
              borderColor: filter === f.key ? (f.color || BRAND.accent) + "66" : BRAND.border,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {loading && (
        <div style={styles.loadingRow}>
          <div style={styles.skeleton} />
          <div style={{ ...styles.skeleton, width: "80%" }} />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={styles.emptyState}>
          {emails.length === 0 ? "All clear. Amber is watching your inbox." : "No items in this filter."}
        </div>
      )}

      {!loading && filtered.map(email => (
        <EmailCard
          key={email.id}
          email={email}
          onResolve={(resolution) => markResolved(email.id, resolution)}
        />
      ))}
    </div>
  );
}

function EmailCard({ email, onResolve }) {
  const [draftText, setDraftText] = useState(email.suggestedReply || "");
  const [expanded, setExpanded] = useState(email.category === "URGENT");
  const [sent, setSent] = useState(false);

  const categoryStyle = {
    "URGENT":        { bg: BRAND.urgentSoft,  text: BRAND.urgent,  label: "URGENT" },
    "ACTION NEEDED": { bg: BRAND.actionSoft,  text: BRAND.action,  label: "ACTION" },
    "FYI":           { bg: BRAND.fyiSoft,     text: BRAND.fyi,     label: "FYI" },
  }[email.category] || { bg: BRAND.accentSoft, text: BRAND.accent, label: email.category };

  // Opens Gmail filtered to this thread
  function openInGmail() {
    const query = encodeURIComponent(
      email.threadId
        ? `in:inbox ${email.threadId}`
        : `from:${email.senderEmail} subject:"${email.subject}"`
    );
    window.open(`https://mail.google.com/mail/u/0/#search/${query}`, "_blank");
  }

  // Opens Gmail compose with the draft pre-filled, marks item as awaiting-reply
  function sendViaGmail() {
    const to = encodeURIComponent(email.senderEmail || "");
    const subject = encodeURIComponent(`Re: ${email.subject || ""}`);
    const body = encodeURIComponent(draftText);
    window.open(
      `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`,
      "_blank"
    );
    setSent(true);
    // Mark as awaiting-reply (not fully resolved — waiting on their response)
    setTimeout(() => onResolve("awaiting-reply"), 1200);
  }

  if (sent) {
    return (
      <div style={{ ...styles.emailCard, opacity: 0.5, justifyContent: "center" }}>
        <span style={{ color: BRAND.done }}>✓ Draft opened in Gmail — marked awaiting reply</span>
      </div>
    );
  }

  return (
    <div style={styles.emailCard}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ ...styles.categoryBadge, background: categoryStyle.bg, color: categoryStyle.text }}>
          {categoryStyle.label}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.emailSender}>{email.sender}</div>
          <div style={styles.emailSubject}>{email.subject}</div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ ...styles.btnGhost, fontSize: 18, lineHeight: 1 }}
        >
          {expanded ? "−" : "+"}
        </button>
      </div>

      {/* Summary (always visible) */}
      <div style={styles.emailSummary}>{email.summary}</div>

      {/* Expanded: draft + actions */}
      {expanded && (
        <div style={{ marginTop: 12 }}>
          {/* Draft reply editor */}
          {draftText !== undefined && (
            <div style={{ marginBottom: 12 }}>
              <div style={styles.draftLabel}>DRAFT REPLY — edit before sending</div>
              <textarea
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                rows={5}
                style={styles.draftTextarea}
                placeholder="Write your reply here..."
              />
            </div>
          )}

          {/* Action buttons */}
          <div style={styles.actionRow}>
            <button onClick={openInGmail} style={{ ...styles.btn, ...styles.btnGhost }}>
              ↗ Open Email
            </button>
            {draftText && (
              <button onClick={sendViaGmail} style={{ ...styles.btn, ...styles.btnAccent }}>
                Send via Gmail →
              </button>
            )}
            <button
              onClick={() => onResolve("resolved")}
              style={{ ...styles.btn, color: BRAND.done }}
            >
              ✓ Done
            </button>
            <button
              onClick={() => onResolve("dismissed")}
              style={{ ...styles.btn, color: BRAND.textMuted, marginLeft: "auto" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── HELPERS ──────────────────────────────────────────────────────────────────

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const today = new Date();
  const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}


// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = {
  card: {
    background: BRAND.surface,
    border: `1px solid ${BRAND.border}`,
    borderRadius: 12,
    padding: "20px 24px",
    marginBottom: 20,
    fontFamily: "'Inter', 'DM Sans', sans-serif",
    color: BRAND.text,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: BRAND.accent,
    margin: 0,
  },
  syncTime: {
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 2,
    display: "block",
  },
  taskRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 10px",
    borderRadius: 8,
    marginBottom: 4,
    transition: "background 0.15s",
    cursor: "default",
  },
  taskName: {
    fontSize: 14,
    fontWeight: 500,
    color: BRAND.text,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  taskMeta: {
    display: "flex",
    gap: 6,
    marginTop: 3,
    alignItems: "center",
  },
  tag: {
    fontSize: 11,
    color: BRAND.textMuted,
    padding: "1px 6px",
    borderRadius: 4,
    background: BRAND.border,
  },
  priorityBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "2px 7px",
    borderRadius: 4,
  },
  statusPill: {
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    padding: "4px 10px",
    borderRadius: 20,
    transition: "opacity 0.15s",
    whiteSpace: "nowrap",
  },
  dropdown: {
    position: "absolute",
    right: 0,
    top: "110%",
    background: "#222",
    border: `1px solid ${BRAND.border}`,
    borderRadius: 8,
    minWidth: 140,
    zIndex: 100,
    overflow: "hidden",
    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
  },
  dropdownItem: {
    display: "block",
    width: "100%",
    padding: "8px 14px",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    fontSize: 13,
    transition: "background 0.1s",
  },
  btn: {
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    padding: "6px 14px",
    borderRadius: 6,
    background: "transparent",
    color: BRAND.text,
    transition: "opacity 0.15s",
  },
  btnAccent: {
    background: BRAND.accent,
    color: "#111",
    fontWeight: 600,
  },
  btnGhost: {
    background: "transparent",
    border: `1px solid ${BRAND.border}`,
    color: BRAND.textMuted,
    cursor: "pointer",
    padding: "5px 10px",
    borderRadius: 6,
    fontSize: 13,
  },
  pendingBadge: {
    fontSize: 11,
    color: BRAND.accent,
    background: BRAND.accentSoft,
    padding: "3px 8px",
    borderRadius: 20,
  },
  filterRow: {
    display: "flex",
    gap: 6,
    marginBottom: 14,
  },
  filterPill: {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 20,
    border: "1px solid",
    cursor: "pointer",
    fontWeight: 500,
    transition: "all 0.15s",
    background: "transparent",
  },
  emailCard: {
    background: BRAND.bg,
    border: `1px solid ${BRAND.border}`,
    borderRadius: 10,
    padding: "14px 16px",
    marginBottom: 10,
  },
  emailSender: {
    fontSize: 13,
    fontWeight: 600,
    color: BRAND.text,
  },
  emailSubject: {
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  emailSummary: {
    fontSize: 12,
    color: BRAND.textMuted,
    marginTop: 8,
    lineHeight: 1.5,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "3px 8px",
    borderRadius: 4,
    flexShrink: 0,
  },
  draftLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: BRAND.textMuted,
    marginBottom: 6,
  },
  draftTextarea: {
    width: "100%",
    background: BRAND.surface,
    border: `1px solid ${BRAND.border}`,
    borderRadius: 8,
    color: BRAND.text,
    fontSize: 13,
    lineHeight: 1.6,
    padding: "10px 12px",
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.15s",
  },
  actionRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  emptyState: {
    textAlign: "center",
    color: BRAND.textMuted,
    fontSize: 13,
    padding: "24px 0",
    fontStyle: "italic",
  },
  errorBanner: {
    background: BRAND.urgentSoft,
    color: BRAND.urgent,
    fontSize: 12,
    padding: "8px 12px",
    borderRadius: 6,
    marginBottom: 12,
  },
  loadingRow: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "8px 0",
  },
  skeleton: {
    height: 14,
    borderRadius: 4,
    background: BRAND.border,
    width: "100%",
    animation: "pulse 1.5s ease-in-out infinite",
  },
};
