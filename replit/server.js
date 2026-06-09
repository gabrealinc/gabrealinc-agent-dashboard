// server.js — Gab Real Inc Dashboard on Replit
// One small Express server that does two jobs:
//   1. Serves the built Vite front end (the /dist folder).
//   2. Proxies every /api/* call to your Supabase edge functions,
//      so your Notion key never touches the browser.
//
// This replaces the auto /api proxy that Lovable (and Vercel) gave you.
// On Replit you run a real server, so this is the natural fit.
//
// Secrets needed (Replit → Tools → Secrets):
//   SUPABASE_URL       e.g. https://xxxx.supabase.co
//   SUPABASE_ANON_KEY  the anon public key
//   (Notion keys stay in Supabase edge-function secrets, not here)

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Every dashboard endpoint maps 1:1 to a Supabase edge function of the same name.
// Add a new line here whenever you add a new edge function.
const ROUTES = {
  "notion-tasks":       "GET",   // load today/overdue tasks
  "update-notion-task": "POST",  // change a task's status
  "amber-emails":       "POST",  // load Needs Attention queue (no body)
  "resolve-comms-item": "POST",  // resolve/dismiss a comms item
  "mae-daily-log":      "GET",   // load Mae's latest daily log
};

// Generic proxy: /api/<name> -> <SUPABASE_URL>/functions/v1/<name>
for (const [name, method] of Object.entries(ROUTES)) {
  app[method.toLowerCase()](`/api/${name}`, async (req, res) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: "SUPABASE_URL or SUPABASE_ANON_KEY not set in Replit Secrets" });
    }
    try {
      const upstream = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
        method,
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: method === "POST" ? JSON.stringify(req.body || {}) : undefined,
      });
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    } catch (err) {
      console.error(`${name} proxy error:`, err);
      return res.status(500).json({ error: `Failed to reach Supabase function: ${name}` });
    }
  });
}

// Serve the built front end and let the SPA handle its own routing.
const dist = path.join(__dirname, "dist");
app.use(express.static(dist));
app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`Dashboard running on ${PORT}`));
