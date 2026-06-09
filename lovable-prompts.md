# Lovable Prompts — Gab Real Inc Dashboard Updates
> Paste each prompt directly into Lovable. Do them in order — each one builds on the last.

---

## PROMPT 1 — Supabase Edge Function: Fetch Tasks from Notion

```
Create a Supabase edge function called `notion-tasks` that fetches tasks from my Notion database.

Add these environment variables to the project:
- NOTION_API_KEY (my Notion integration secret key)
- NOTION_TASKS_DB with the value: 222a4fa7-7eaf-814b-94e1-000b3c08ca36

The edge function should send a POST request to:
https://api.notion.com/v1/databases/${NOTION_TASKS_DB}/query

Use these headers:
- Authorization: Bearer ${NOTION_API_KEY}
- Notion-Version: 2022-06-28
- Content-Type: application/json

Filter the query to return only tasks where:
- Due Date equals today OR equals tomorrow OR is before today (overdue)
- AND Status does not equal "Done"
- AND Status does not equal "Archived"

Sort results by Due Date ascending.

Map each result to this shape:
{
  id: page.id,
  name: page.properties.Name.title[0].plain_text,
  status: page.properties.Status.status.name,
  priority: page.properties.Priority.select.name (lowercase),
  dueDate: page.properties["Due Date"].date.start,
  project: page.properties.Project.select.name
}

Return { tasks: [...] } as JSON with CORS headers allowing all origins.
```

---

## PROMPT 2 — Supabase Edge Function: Update Task Status in Notion

```
Create a Supabase edge function called `update-notion-task` that updates a single task's status in Notion.

It should accept a POST request with a JSON body containing:
- taskId (the Notion page ID)
- status (the new status string)

Send a PATCH request to:
https://api.notion.com/v1/pages/${taskId}

With body:
{
  "properties": {
    "Status": { "status": { "name": status } }
  }
}

Use the NOTION_API_KEY environment variable for the Authorization header and set Notion-Version to 2022-06-28.

Return { ok: true } on success. Include CORS headers for all origins and handle OPTIONS preflight requests.
```

---

## PROMPT 3 — Supabase Edge Function: Fetch Email Flags from Notion

```
Create a Supabase edge function called `ember-emails` that reads email flags written by my AI agent (Ember) from a Notion page.

Add an environment variable called NOTION_BRIEF_PAGE — I will fill in the page ID manually after setup.

The function should fetch all blocks from that Notion page using:
GET https://api.notion.com/v1/blocks/${NOTION_BRIEF_PAGE}/children?page_size=100

With the NOTION_API_KEY and Notion-Version: 2022-06-28 headers.

Then parse the blocks to find email entries. Each email entry in Notion is written in this format (as separate paragraph blocks):

SENDER: Name <email@domain.com>
SUBJECT: Subject line here
CATEGORY: URGENT
SUMMARY: One-line description of what the email is about.
DRAFT REPLY: The suggested reply text here. Can be multiple lines.
THREAD_ID: optional_gmail_thread_id
---

Parse these into objects with fields: id, sender, senderEmail, subject, category, summary, suggestedReply, threadId.

Sort results so URGENT comes first, then ACTION NEEDED, then FYI.

Return { emails: [...] } as JSON with CORS headers for all origins.
```

---

## PROMPT 4 — Supabase Edge Function: Resolve an Email Flag

```
Create a Supabase edge function called `resolve-email-flag` that accepts a POST request with { emailId } in the body.

For now it should just return { ok: true, emailId } — the UI handles removal optimistically. Include CORS headers for all origins and handle OPTIONS preflight.
```

---

## PROMPT 5 — Task Priorities Component with Inline Status Editing

```
Add a "Top Priorities" section to the dashboard. This section should:

FETCH DATA
- On mount, call GET /api/notion-tasks (the Supabase edge function we just created)
- Show a loading skeleton while fetching (3 animated gray bars)
- Show a refresh button (↻) in the header that re-fetches

DISPLAY
- Section heading: "TOP PRIORITIES" in small uppercase tracked letters, styled in warm sand / gold tone to match the dashboard
- Show a "synced at [time]" subtitle below the heading
- List each task as a row containing:
  - Task name (left, truncated if too long)
  - Project tag (small pill, muted)
  - Due date tag — show "Today", "Tomorrow", "X days overdue" — overdue dates should show in red
  - Priority badge on the right: HIGH (red tint), MED (gold tint), LOW (gray) — all caps, small
  - Status dropdown on the right (see below)

STATUS DROPDOWN (inline editing)
- Each task has a clickable status pill showing the current status
- Clicking it opens a small dropdown with these options: Not Started, In Progress, Waiting, Blocked, Done, Archived
- Each option should be colored to match its meaning: In Progress = gold, Blocked = red, Done = green, Waiting = blue, the rest gray
- When a user selects a new status, update it locally immediately (optimistic)
- The row should get a subtle left border accent and light background tint to show it has an unsaved change
- Show an "X unsaved" badge in the header counting how many tasks have pending changes

SAVING
- Show a "Save to Notion" button in the header whenever there are unsaved changes
- On click, POST each changed task to /api/update-notion-task with { taskId, status }
- Run all saves in parallel
- On success: clear pending state and update the sync time
- On error: show a small red error banner saying "Save failed. Changes are still showing locally."

EMPTY STATE
- If no tasks are due: show centered muted italic text saying "Nothing due today. Go enjoy your life."

Style everything dark — near-black backgrounds, subtle borders, warm sand/gold accent color — consistent with the rest of the dashboard.
```

---

## PROMPT 6 — Email Action Cards with Open + Edit + Send

```
Add an "Emails & Messages" section to the dashboard. This section should:

FETCH DATA
- On mount, call GET /api/ember-emails
- Show a loading skeleton while fetching
- Show a refresh button (↻) in the header

FILTER PILLS
- Below the heading, show three filter pills: "All (N)", "Urgent (N)", "Action (N)"
- Clicking a pill filters the visible cards
- Active pill gets colored background matching its category (red for Urgent, gold for Action, sand for All)

EMAIL CARDS
Each email flag is displayed as a card. Default state (collapsed for non-urgent, expanded for URGENT):

Collapsed view shows:
- Category badge on the left: URGENT (red), ACTION (gold), FYI (blue) — uppercase small pill
- Sender name (bold)
- Subject line (muted, truncated)
- One-line summary below
- A + / − toggle button to expand

Expanded view adds:
- An editable textarea pre-filled with the suggested draft reply
  - Label above it: "DRAFT REPLY — edit before sending" in small caps
  - Textarea should be resizable vertically, dark background, warm text color, rounded
- Three action buttons in a row:
  - "↗ Open Email" — ghost/outline style. Clicking opens Gmail filtered to that thread. Build the Gmail search URL using the senderEmail and subject: https://mail.google.com/mail/u/0/#search/from%3A{senderEmail}+subject%3A{subject}
  - "Send via Gmail →" — filled accent button. Clicking opens Gmail compose pre-filled with: To = senderEmail, Subject = "Re: {subject}", Body = the current textarea text. Use this URL format: https://mail.google.com/mail/u/0/?view=cm&fs=1&to={to}&su={subject}&body={body}. After clicking, briefly show a ✓ confirmation then call POST /api/resolve-email-flag and remove the card.
  - "Dismiss" — right-aligned ghost text button. Removes the card from the UI and calls POST /api/resolve-email-flag.

EMPTY STATE
- If inbox is clear: "Inbox is clear. Ember is watching."

Style cards dark with subtle borders, consistent with the rest of the dashboard. URGENT cards should have a faint red left border to stand out.
```

---

## PROMPT 7 — Wire Both Sections into the Dashboard Layout

```
Place the two new sections I just built — "Top Priorities" and "Emails & Messages" — into the main dashboard layout.

Put "Top Priorities" in the left or primary column, near the top, so it's the first thing visible without scrolling.

Put "Emails & Messages" below Top Priorities or in a secondary column — wherever the current "Emails" section lives if one already exists. If there's already a placeholder for emails, replace it with the new component.

Make sure both sections have consistent spacing, card border radius, and color with the rest of the dashboard. No need to change the header, navigation, or any other existing sections.
```

---

## AFTER SETUP — Update Ember's Notion Writing Format

Once the dashboard is live, paste this prompt in a Sage conversation to update Ember's output format so the edge function can parse her email flags cleanly:

```
Update Ember's system prompt. In the "WHAT YOU PASS TO SAGE" section, change the format for flagged emails in the Notion brief.

Each email flag should be written as separate paragraph blocks in this exact format:

SENDER: [Full Name <email@domain.com>]
SUBJECT: [Subject line]
CATEGORY: [URGENT or ACTION NEEDED or FYI]
SUMMARY: [One sentence describing what the email is about and what's needed]
DRAFT REPLY: [The full suggested reply, plain text, no markdown]
THREAD_ID: [Gmail thread ID if available, otherwise omit this line]
---

Write one block per email. Separate each email with a line that just says ---

Write all email flags under a heading called "EMAILS & MESSAGES" on the Sage Daily Brief Notion page. This structured format is required so the dashboard can read and display them as interactive cards.
```
