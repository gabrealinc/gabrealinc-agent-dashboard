import { randomBytes } from "crypto";
import { Request, Response, NextFunction } from "express";

/**
 * Session token generated fresh on every server start.
 * The frontend fetches it once from /api/auth/session-token (CORS-gated to
 * Replit/localhost origins) and attaches it to every subsequent API call.
 * This is secure-by-default — no manual secret configuration required.
 */
export const SESSION_TOKEN = randomBytes(32).toString("hex");

export function dashboardAuth(req: Request, res: Response, next: NextFunction) {
  const bearer = (req.headers["authorization"] ?? "").replace(/^Bearer\s+/i, "");
  const header = (req.headers["x-dashboard-secret"] as string) ?? "";

  if (bearer === SESSION_TOKEN || header === SESSION_TOKEN) return next();
  return res.status(401).json({ error: "Unauthorized" });
}
