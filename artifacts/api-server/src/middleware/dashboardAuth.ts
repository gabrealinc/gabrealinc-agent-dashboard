import { randomBytes } from "crypto";
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { Request, Response, NextFunction } from "express";

/**
 * Per-process session token.  Generated fresh on each server start.
 * Written to a shared tmp file so the Vite dev server can read it as
 * VITE_API_TOKEN at startup — the token is never served over HTTP.
 */
export const SESSION_TOKEN: string =
  process.env.DASHBOARD_SECRET ?? randomBytes(32).toString("hex");

// Write token to a known tmp path so the frontend build can consume it.
try {
  writeFileSync(join(tmpdir(), "gabreal-api-token"), SESSION_TOKEN, "utf8");
} catch {
  // Non-fatal — frontend will fall back to empty token (dev only)
}

export function dashboardAuth(req: Request, res: Response, next: NextFunction) {
  const bearer = (req.headers["authorization"] ?? "").replace(/^Bearer\s+/i, "");
  const header = (req.headers["x-dashboard-secret"] as string) ?? "";

  if (bearer === SESSION_TOKEN || header === SESSION_TOKEN) return next();
  return res.status(401).json({ error: "Unauthorized" });
}
