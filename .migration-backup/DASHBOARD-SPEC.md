# Gabreal Command Center — Dashboard Spec v2.0
`dashboard.gabrealinc.com`

Built in Lovable. Warm, editorial, personal. This is Gabby's command center — not a tool, a space.

---

## Design System

```css
/* Colors — warm peach palette, match existing dashboard exactly */
--color-bg: #FDF0E0              /* warm cream page background */
--color-surface: #FFFFFF         /* card backgrounds */
--color-surface-warm: #FDF6EE    /* slightly warmer card variant */
--color-border: #F0E0CC          /* soft warm border */
--color-text-primary: #1A1A1A    /* near-black */
--color-text-secondary: #8A7A6A  /* warm gray */
--color-accent: #E8A040          /* warm orange — primary CTA, active tab, highlights */
--color-accent-text: #C47820     /* darker orange for text on light bg */
--color-accent-bg: #FDF0E0       /* orange tint background */
--color-green: #7AB87A           /* active status, paid */
--color-green-bg: #EFF7EF        /* green pill background */
--color-yellow: #E8C040          /* scheduled / warning */
--color-yellow-bg: #FDF8E8       /* yellow pill background */
--color-gray: #B0A090            /* idle / inactive */
--color-gray-bg: #F5F0EB         /* gray pill background */
--color-red-bg: #FFF0EE          /* error / failed to fetch background */
--color-red: #C07060             /* error text */

--font-body: 'Inter', sans-serif
--font-display: 'Playfair Display', serif  /* page titles, "Good morning, Gabby" */
--radius: 16px
--radius-sm: 8px
--shadow: 0 1px 3px rgba(0,0,0,0.06)
```

**Typography:**
- Page greeting: Playfair Display, large, dark
- Section labels: Inter, 11px, uppercase, letter-spaced, accent color
- Body: Inter, 14px, #1A1A1A
- Secondary text: Inter, 13px, #8A7A6A
- Card titles: Inter, 15px, semibold

**Layout:**
- Max width: 1400px, centered
- Sticky top nav with horizontal tabs
- Cards use 16px padding, 16px radius, white background, subtle shadow
- Generous whitespace — clean, not cramped

---

## Navigation

```
Gabreal Command Center          [date top right]

HOME · CLIENTS · FINANCE · INTELLIGENCE · SUBSTACK · AGENTS · SPIRIT
```

Active tab: accent color text + underline
Inactive: dark gray text, no underline

---

## View 1: HOME

Four sections stacked vertically on left + right columns (2-col on desktop, 1-col on mobile):

### Left Column

**Today's Schedule**
- Section label: "TODAY'S SCHEDULE" in accent color
- List of calendar events: time (left, muted) + event name (right, dark)
- "View full calendar" link bottom right in accent color
- Refresh icon top right
- Source: Google Calendar MCP

**Needs Your Attention**
- Section label: "NEEDS YOUR ATTENTION" in accent color
- Subtitle: "Proposals from Amber"
- Filter pills: All · Urgent · Action · Gmail · Slack (pill style, active = accent bg + accent text)
- Each item is a card (see card specs below)
- If empty: italic gray text "All clear. Amber is watching your inbox."
- If failed to fetch: warm red banner "Failed to fetch" with retry button
- Source: Supabase edge function → Notion Comms Log DB

**Sage Chat**
- Section label: "SAGE" in accent color
- Subtitle: "Ready to help."
- Input: "Ask Sage anything..." placeholder
- Send button (accent colored)
- Powered by Claude via Supabase
- Maintains conversation history in session

### Right Column

**Today's Priorities**
- Section label: "TODAY'S PRIORITIES" in accent color
- Subtitle: "synced at [time]"
- Task rows: checkbox circle + task name + due date + status dropdown
- Status options: To Do · In Progress · Done (pill style)
- Source: Notion Tasks DB, filtered by due = today or overdue
- Refresh icon top right

---

## Needs Attention Card Types

### Communication Card (Amber — Gmail/Slack/WhatsApp)
```
┌──────────────────────────────────────────────────────┐
│ [High] [Gmail]  Luna Vita                 2 hours ago │
│                                                       │
│ Kea replied asking about the brand deck timeline      │
│                                                       │
│ Why it matters: Active deliverable, client waiting    │
│                                                       │
│ Draft Reply ─────────────────────────────────────── │
│ [editable textarea with Amber's draft]               │
│                                                       │
│ [Send ✓]  [Edit + Send ✎]  [Dismiss]                │
└──────────────────────────────────────────────────────┘
```
- Send → action_status = `approved-send`
- Edit + Send → opens textarea, saves edits, action_status = `edited-send`
- Dismiss → action_status = `dismissed`

### Task Proposal Card (Milton/Amber)
```
┌──────────────────────────────────────────────────────┐
│ [Medium] PROPOSED TASK  Luna Vita          yesterday  │
│                                                       │
│ Send revised brand deck to Kea by Thursday            │
│ [editable inline title]                               │
│                                                       │
│ From: Luna Vita strategy call                         │
│ Due: [date picker]                                    │
│                                                       │
│ [Approve ✓]  [Edit + Approve ✎]  [Deny ✕]           │
└──────────────────────────────────────────────────────┘
```
- Approve → action_status = `task-approved`
- Edit + Approve → saves edits, action_status = `task-edited`
- Deny → action_status = `task-denied` (gone forever)

### Finance / Legal / System flags follow same card structure with appropriate actions.

---

## View 2: CLIENTS

Grid of client cards, 3 across.

**Header:** "Clients" (Playfair Display) + count line "11 Active, 3 GHL, 3 Incubator"

**Filter tabs:** ACTIVE · GHL · INCUBATOR · ALL

**Client Card:**
```
┌─────────────────────────────────────┐
│ [avatar initials]  Client Name  ACTIVE ▾ │
│ Industry tagline                    │
│                                     │
│ PAY STRUCTURE    VALUE              │
│ Retainer         $5,000/mo          │
│                                     │
│ CHANNEL          START DATE         │
│ 🔗 Slack         Aug 31, 2025       │
└─────────────────────────────────────┘
```

Avatar: colored circle with initials (generate color from name hash)
Expand chevron reveals: active projects, last comms date, open tasks count, link to Notion client page

**Data source:** Notion Clients DB (live, no cache)

---

## View 3: FINANCE

**Header stats row (3 cards):**
- Revenue YTD — total paid invoices from GHL
- Outstanding Invoices — unpaid balance
- Invoices on File — total count

**Monthly Revenue (Paid)** — bar chart, accent orange bars, month labels, value above each bar. Chart.js.

**Invoices table:**
| CLIENT | DESCRIPTION | AMOUNT | DATE | STATUS |
|---|---|---|---|---|
Paid = green pill, Pending = yellow pill, Overdue = red pill

**Filter:** Year to date / This month / Last month / Custom range

**Personal Finance section (below):**
- "Gabrielle Greenberg — Wells Fargo" header
- Salary received this period: ✓ or ✗
- Savings check: on track / needs attention

**Tax Calendar:**
- Next deadline: date + days away
- Amount to set aside (net profit × 27.5%)

**Source:** Supabase edge function → QuickBooks MCP + GHL data

---

## View 4: INTELLIGENCE

**Header:** "Intelligence" (Playfair Display) + "AI-curated updates, industry signals, and opportunities."

**Sections:**
- AI & AUTOMATION
- MARKETS & ECONOMY
- INDUSTRY & COMPETITORS
- CLIENT WATCH (one subsection per active client with news)
- OPPORTUNITY RADAR

Each news item card:
```
┌─────────────────────────────────────┐
│ [Source tag]                        │
│ Article headline                    │
│ One-line summary                    │
│ Date              Read more ▾       │
└─────────────────────────────────────┘
```

Expand "Read more" shows full summary + [Flag as Opportunity] button.
Flagging creates a Task Proposal in Needs Attention.

**Source:** Nancy's latest report from Nancy Reports DB via Supabase edge function

---

## View 5: SUBSTACK

**Header:** "Substack" + "Write, edit, and publish your newsletter."

**Two-panel layout:**

Left panel (post list, ~300px):
- Filter tabs: All · Idea · Draft · In Progress · In Review · Ready · Done · Published · On Hold · Archived · To Do
- Post list: title + status pill + date
- + New button (accent)
- Click post → opens in right panel

Right panel (editor):
- Post title (large, editable)
- Subtitle (editable, muted)
- Rich text editor toolbar: B I H Link Quote Bullets Numbers Image HR
- Full post body (editable)
- Publish / Schedule / Save Draft buttons

**Source:** Notion Substack Posts DB (`318a4fa7-7eaf-8431-000b058c0cbe`)

---

## View 6: AGENTS

**Header:** "Agents" + "Your multi-agent operating system."

**Agent grid (2 across):**
```
┌────────────────────────────────────────┐
│ 🟢 Amber · Communication Manager  Active ▾ │
│                                         │
│ Monitors Gmail, Slack, and WhatsApp.    │
│ Classifies, drafts replies, executes    │
│ approved dashboard actions.             │
│                                         │
│ Last active: 12 minutes ago             │
└────────────────────────────────────────┘
```

Status dots: 🟢 Active (ran within window) · 🟡 Scheduled · ⚪ Idle · 🔴 Error

**Full agent roster:**
- **Amber** · Communication Manager · hourly
- **Mae** · System Librarian · 6:45am + 1pm + 5pm
- **Liala** · Spirit Team · 7:00am
- **Nancy** · Research Analyst · 7:30am
- **Milli** · Finance Watchdog · 7:45am
- **Sage** · Executive Partner · 8:00am weekdays
- **Milton** · Meeting Intelligence · 5:00pm weekdays
- **Lennard** · Legal/HR · Tuesdays 8:00am

**Agent Activity log** (below grid):
- Running log of last run times, items processed, any errors
- Each entry: agent name + timestamp + summary line

**Mac Mini Controls:**
```
┌─────────────────────────────────────────────────────┐
│ MAC MINI                                             │
│                                                     │
│ [Wake Mac Mini 🌐]    [Open Screen Share 🖥]        │
└─────────────────────────────────────────────────────┘
```
- Wake button → POST `/functions/v1/wake-mac-mini` → sends WoL magic packet via Tailscale
- Screen Share → opens `vnc://[tailscale-ip]`

---

## View 7: SPIRIT (Liala)

Softer design. More whitespace. Warm but with slight purple undertone.

**Header:** "Good morning, Gabby." in Playfair Display + today's date

**Cycle Phase card** (full width, centered):
Large phase name + poetic description + energetic theme (large, typographic)

**2-col grid below:**

Left:
- Body Check-In (one question, italic)
- Today's Intention (large pull quote)
- Pattern Insight (if available, muted)

Right:
- Meals (phase-appropriate, 2-3 suggestions)
- Movement (recommendation)
- Nervous System Practice (expandable)
- Spiritual Practice (expandable)

**Cycle tracking widget** (top right of page):
"Cycle day [X] · [Phase]  [Update start date]"
Clicking "Update start date" opens a small date picker → writes to Notion Spirit Team Tracking page.

---

## Supabase Edge Functions

| Endpoint | Method | Purpose |
|---|---|---|
| `/functions/v1/amber-emails` | POST | Fetch Comms Log needs_attention items |
| `/functions/v1/resolve-comms-item` | POST | Update action_status + edited content |
| `/functions/v1/milli-finance` | GET | Fetch latest Milli finance report |
| `/functions/v1/nancy-brief` | GET | Fetch latest Nancy intelligence brief |
| `/functions/v1/agent-status` | GET | Fetch last run time/status for all agents |
| `/functions/v1/spirit-daily` | GET | Fetch today's Liala brief |
| `/functions/v1/update-cycle` | POST | Update cycle start date in Notion |
| `/functions/v1/wake-mac-mini` | POST | Send WoL magic packet via Tailscale |
| `/functions/v1/notion-tasks` | GET | Fetch today's tasks from Notion |
| `/functions/v1/notion-clients` | GET | Fetch active clients from Notion |
| `/functions/v1/ghl-finance` | GET | Fetch invoice/revenue data from GHL |
| `/functions/v1/substack-posts` | GET | Fetch posts from Notion Substack DB |
| `/functions/v1/update-substack-post` | POST | Update post content/status in Notion |

---

## Environment Variables

```
NOTION_API_KEY=
NOTION_COMMS_LOG_DB=8fda87c9-d071-434f-b3b2-130fbfdb1f83
NOTION_TASKS_DB=222a4fa7-7eaf-814b-94e1-000b3c08ca36
NOTION_CLIENTS_DB=222a4fa7-7eaf-81f4-b741-000bbb83b04f
NOTION_DOCUMENTS_DB=30ea4fa7-7eaf-8047-b7c2-000b44068841
NOTION_SUBSTACK_DB=318a4fa7-7eaf-8431-000b058c0cbe
NOTION_MILLI_REPORTS_DB=98fbd3b5-d89e-45f3-a49b-5403620707f6
NOTION_NANCY_REPORTS_DB=375a4fa7-7eaf-8068-8276-000ba44de091
NOTION_SAGE_REPORTS_DB=375a4fa7-7eaf-80ea-96e4-000b94fc8601
NOTION_AMBER_REPORTS_DB=375a4fa7-7eaf-80ea-9cf8-000b1820e753
NOTION_MAE_REPORTS_DB=375a4fa7-7eaf-80ef-bcb9-000bdf77c14f
NOTION_MEETING_NOTES_DB=304a4fa7-7eaf-8059-9a15-000bec21a458
NOTION_MEETING_NOTES_REPORTS_DB=a7ddc2f5-4357-415e-ab0d-33ba34779ab4
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MAC_MINI_TAILSCALE_IP=        # set after Tailscale install
MAC_MINI_MAC_ADDRESS=         # hardware MAC address for WoL
GHL_API_KEY=
```

---

## Mac Mini Setup (for Wake + Screen Share)

1. Install Tailscale on Mac Mini + laptop + phone → free at tailscale.com
2. System Settings → General → Sharing → enable Screen Sharing + Remote Login
3. System Settings → Energy → enable "Wake for network access"
4. Note Mac Mini's Tailscale IP and hardware MAC address → add to env vars above
5. Supabase `wake-mac-mini` function sends WoL magic packet to MAC address via UDP

---

## Mobile

- All views stack to single column
- Cards are full width, action buttons are large tap targets (48px min)
- Spirit view is designed mobile-first — Liala in the morning on the phone
- Finance charts collapse to key stats only on mobile
- Substack editor simplified on mobile (view only, edit on desktop)
