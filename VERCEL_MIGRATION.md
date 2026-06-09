# Dashboard → Vercel Migration Guide
**Gab Real Inc — dashboard.gabrealinc.com**

---

## What's Changing

Lovable hosts your dashboard and automatically proxies all `/api/` calls to your Supabase edge functions. When you move to Vercel, that proxy is gone — so we've added 4 Vercel serverless functions (in the `/api/` folder) that do the same thing. Your dashboard components don't need any changes.

---

## Step 1 — Export from Lovable to GitHub

1. Open your Lovable project
2. Click the **GitHub** button in the top right (or go to Settings → Integrations → GitHub)
3. Connect your GitHub account if you haven't already
4. Create a new repo (suggested name: `gab-real-dashboard`) or push to an existing one
5. Lovable will push the full project code to GitHub

---

## Step 2 — Add the Vercel Files to Your Repo

These files are already created and ready in your Dashboard folder. Add them to the root of your GitHub repo:

```
your-repo/
├── api/
│   ├── notion-tasks.js          ← NEW
│   ├── update-notion-task.js    ← NEW
│   ├── ember-emails.js          ← NEW
│   └── resolve-email-flag.js    ← NEW
├── vercel.json                  ← NEW
├── .env.example                 ← NEW (reference only, don't commit real values)
├── src/
│   └── ... (your existing Lovable code)
└── package.json
```

Push these files to your GitHub repo.

---

## Step 3 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **Add New Project**
3. Import your GitHub repo (`gab-real-dashboard`)
4. Vercel will auto-detect it as a Vite project
5. Leave build settings as-is (vercel.json handles everything)
6. Click **Deploy** — don't add env vars yet, do that next

---

## Step 4 — Add Environment Variables in Vercel

Go to your Vercel project → **Settings → Environment Variables** and add:

| Variable | Value | Where to find it |
|---|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase → Project Settings → API → anon public key |

After adding, go to **Deployments → Redeploy** so the new vars take effect.

> The Notion keys (NOTION_API_KEY, NOTION_TASKS_DB, NOTION_BRIEF_PAGE) live in Supabase edge function secrets — not Vercel. Those are already set up and don't need to change.

---

## Step 5 — Set Your Custom Domain

1. In Vercel → your project → **Settings → Domains**
2. Add `dashboard.gabrealinc.com`
3. Vercel will give you a DNS record (CNAME or A record)
4. Go to your domain registrar (wherever gabrealinc.com is managed) and add that record
5. Vercel auto-provisions SSL — usually live within minutes

---

## Step 6 — Fix the Sage Model Error

The error you saw (`⚠️ model: claude-3-5-sonnet-20241022`) means the Sage chat is calling an outdated Claude model. To fix it:

1. Go to Supabase → **Edge Functions**
2. Find the function that powers Sage's chat (likely called `sage-chat`, `chat`, or similar)
3. Look for this line:
   ```
   model: "claude-3-5-sonnet-20241022"
   ```
4. Replace it with:
   ```
   model: "claude-sonnet-4-6"
   ```
5. Redeploy the edge function

---

## Checklist

- [ ] Exported Lovable project to GitHub
- [ ] Added `/api/` folder + `vercel.json` to repo and pushed
- [ ] Connected GitHub repo to Vercel and deployed
- [ ] Added `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel env vars
- [ ] Redeployed after adding env vars
- [ ] Set custom domain `dashboard.gabrealinc.com` in Vercel
- [ ] Updated DNS records at domain registrar
- [ ] Fixed Sage model string in Supabase edge function
- [ ] Tested: Task Priorities loads from Notion
- [ ] Tested: Status changes save back to Notion
- [ ] Tested: Emails & Messages loads from Ember's brief
- [ ] Tested: Sage chat responds without the model error

---

## If Something Breaks

**Tasks not loading:** Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set correctly in Vercel env vars. Visit `https://your-vercel-url/api/notion-tasks` directly in a browser to see the raw error.

**Sage still showing model error:** The edge function needs a redeploy after the model string change. In Supabase → Edge Functions, hit Deploy again after editing.

**Domain not resolving:** DNS propagation can take up to 24 hours but is usually under 15 minutes. Check your CNAME/A record at [dnschecker.org](https://dnschecker.org).
