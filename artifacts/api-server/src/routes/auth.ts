import { Router, Request, Response } from "express";
import { SESSION_TOKEN } from "../middleware/dashboardAuth";

const router = Router();

/**
 * GET /api/auth/session-token
 * Returns the per-process session token so the frontend can authenticate
 * subsequent API calls. This route is CORS-gated (Replit/localhost only),
 * so external callers cannot reach it.
 */
router.get("/session-token", (_req: Request, res: Response) => {
  res.json({ token: SESSION_TOKEN });
});

export default router;
