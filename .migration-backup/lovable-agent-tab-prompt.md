# Lovable Prompt: Agent OS Tab

Use this prompt in Lovable to add an "Agent OS" tab to the existing Gab Real Inc dashboard.

---

## Prompt

Add a new tab called "Agent OS" to the dashboard navigation. This tab shows a weekly intelligence view of Gabby's AI operating system: what work was done, what agents learned, and insights for scaling.

The tab has three views toggled by pills at the top: "Weekly Summary", "By Agent", and "By Client".

### Weekly Summary View (default)

Pull data from the Notion "Sage Weekly Digest" page (most recent entry). Display:

**Header:** "Week of [date range]" with a subtle gradient background matching the dashboard brand.

**Work Completed section:** Card grid showing each client with activity. Each card shows: client name, project summary, hours if available, and a status chip (delivered / in progress / blocked). Cards are sorted by most activity first.

**Key Learnings section:** A clean list of bullet-style insights from the week. Each learning has a small tag indicating source (agent name or client name). Expandable on click to show full context.

**Replicable Patterns section:** Highlighted callout boxes (gold/brass accent border) for anything flagged as packageable. Each box shows: pattern name, description, which client it came from, and a "Create Skill" button (future functionality, disabled for now with tooltip "Coming soon").

**Agent Health row:** Horizontal strip of 6 small cards, one per agent (Amber, Mae, Charli, Sage, Legal, Meeting Notes). Each shows: agent name, status indicator (green dot = ran successfully, yellow = warning, red = error), last run time, and a one-line summary of their week.

### By Agent View

Shows each agent in a larger card format with:
- Agent name and role description
- Schedule (e.g., "Hourly 6am-5pm weekdays")
- Last 7 days of run history as a mini heatmap (green = successful, grey = no run expected, red = issue)
- Expandable "Learning Log" section that shows recent entries from that agent's learning log
- "Performance Notes" area for patterns observed

Clicking an agent card expands it full-width to show the complete learning log and recent run outputs.

### By Client View

Shows each client in a card format with:
- Client name and active project count
- This week's deliverables (from the weekly digest)
- Hours invested this week (if tracked)
- "Learnings" count badge
- Expandable section showing the client's learning log entries from this week

Clicking a client card expands to show full work log and learning log.

### Design Notes

- Match existing dashboard styling (dark mode, cream/espresso/aperol accents)
- Brand colors: Cream #F6EFE2, Espresso #1A0F0A, Aperol #D95B24, Sand #E6D2B7, Brass #B88A44
- Font stack: Outfit for body, Bodoni Moda for any display headers
- Cards should have subtle hover animations
- Mobile responsive: stack cards vertically, collapse pill navigation into a dropdown
- Data source: Notion API (same connection as existing dashboard tabs)
- The Sage Weekly Digest Notion page is the primary data source for this tab

### Notion Integration

The tab reads from:
- "Sage Weekly Digest" page (weekly summaries, written every Friday)
- Notion Tasks database (for work completed data)
- Notion Comms Log (for communication volume)

Use the same Notion API connection already configured for the dashboard.
