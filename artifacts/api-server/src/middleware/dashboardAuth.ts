import { Request, Response, NextFunction } from "express";

/**
 * Lightweight auth guard for connector-backed routes.
 * If DASHBOARD_SECRET is set, every request must supply it as:
 *   - Bearer token in Authorization header, OR
 *   - X-Dashboard-Secret header
 * When the secret is not configured the middleware is a no-op (dev convenience).
 */
export function dashboardAuth(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.DASHBOARD_SECRET;
  if (!secret) return next();

  const bearer = (req.headers["authorization"] ?? "").replace(/^Bearer\s+/i, "");
  const header = req.headers["x-dashboard-secret"] ?? "";

  if (bearer === secret || header === secret) return next();
  return res.status(401).json({ error: "Unauthorized" });
}
