import { Router } from "express";

const router = Router();

const SUPABASE_ROUTES: Record<string, "GET" | "POST"> = {
  "notion-tasks": "GET",
  "update-notion-task": "POST",
  "amber-emails": "POST",
  "resolve-comms-item": "POST",
  "mae-daily-log": "GET",
  "milli-finance": "GET",
  "nancy-brief": "GET",
  "agent-status": "GET",
  "spirit-daily": "GET",
  "update-cycle": "POST",
  "wake-mac-mini": "POST",
  "notion-clients": "GET",
  "ghl-finance": "GET",
  "substack-posts": "GET",
  "update-substack-post": "POST",
  "sage-chat": "POST",
};

for (const [name, method] of Object.entries(SUPABASE_ROUTES)) {
  const handler = async (req: any, res: any) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({
        error: "SUPABASE_URL or SUPABASE_ANON_KEY not configured in Replit Secrets",
      });
    }

    try {
      const upstream = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
        method,
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
        body: method === "POST" ? JSON.stringify(req.body || {}) : undefined,
      });
      const data = await upstream.json();
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(upstream.status).json(data);
    } catch (err: any) {
      req.log.error({ err }, `${name} proxy error`);
      return res.status(500).json({ error: `Failed to reach Supabase function: ${name}` });
    }
  };

  if (method === "GET") {
    router.get(`/${name}`, handler);
  } else {
    router.options(`/${name}`, (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "content-type");
      res.status(200).end();
    });
    router.post(`/${name}`, handler);
  }
}

export default router;
