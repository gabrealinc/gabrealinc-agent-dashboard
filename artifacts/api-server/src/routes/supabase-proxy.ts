import { Router, Request, Response, NextFunction } from "express";

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
  "create-notion-client": "POST",
};

/**
 * Routes that perform sensitive/operational actions and require
 * an additional DASHBOARD_SECRET token when the env var is set.
 */
const SENSITIVE_ROUTES = new Set([
  "wake-mac-mini",
  "update-notion-task",
  "resolve-comms-item",
  "update-cycle",
  "create-notion-client",
  "update-substack-post",
]);

/**
 * Middleware: if DASHBOARD_SECRET is configured, all POST requests
 * to sensitive routes must supply it as a Bearer token in the
 * Authorization header OR as the X-Dashboard-Secret header.
 */
function requireSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.DASHBOARD_SECRET;
  if (!secret) {
    return next(); // gracefully skip when not configured
  }
  const authHeader = req.headers["authorization"] ?? "";
  const headerSecret = req.headers["x-dashboard-secret"] ?? "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";
  if (bearerToken === secret || headerSecret === secret) {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized" });
}

for (const [name, method] of Object.entries(SUPABASE_ROUTES)) {
  const handler = async (req: Request, res: Response) => {
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
      const origin = req.headers.origin ?? "";
      const allowedOrigin =
        process.env.ALLOWED_ORIGIN ??
        (origin.includes("replit") || origin.includes("localhost")
          ? origin
          : "");
      if (allowedOrigin) {
        res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
        res.setHeader("Vary", "Origin");
      }
      return res.status(upstream.status).json(data);
    } catch (err: any) {
      (req as any).log?.error({ err }, `${name} proxy error`);
      return res.status(500).json({ error: `Failed to reach Supabase function: ${name}` });
    }
  };

  if (method === "GET") {
    router.get(`/${name}`, handler);
  } else {
    // Preflight
    router.options(`/${name}`, (req: Request, res: Response) => {
      const origin = req.headers.origin ?? "";
      const allowedOrigin =
        process.env.ALLOWED_ORIGIN ??
        (origin.includes("replit") || origin.includes("localhost")
          ? origin
          : "");
      if (allowedOrigin) {
        res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
        res.setHeader("Vary", "Origin");
      }
      res.setHeader("Access-Control-Allow-Headers", "content-type, x-dashboard-secret, authorization");
      res.status(200).end();
    });

    const middlewares = SENSITIVE_ROUTES.has(name)
      ? [requireSecret, handler]
      : [handler];
    router.post(`/${name}`, ...middlewares);
  }
}

export default router;
