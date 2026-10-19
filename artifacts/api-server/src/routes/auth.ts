import crypto from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import { clearSession, createSession, setSessionCookie } from "../lib/auth";

const router: IRouter = Router();

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(GetCurrentAuthUserResponse.parse({
    user: req.isAuthenticated() ? req.user : null,
  }));
});

router.post("/auth/password-login", (req: Request, res: Response) => {
  const dashboardPassword = process.env.DASHBOARD_PASSWORD;
  if (!dashboardPassword) {
    res.status(503).json({ error: "DASHBOARD_PASSWORD not configured" });
    return;
  }

  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!password || !safeEqual(password, dashboardPassword)) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  const token = createSession({
    id: "gabby",
    email: null,
    firstName: "Gabby",
    lastName: null,
    profileImageUrl: null,
  });
  setSessionCookie(res, token);
  res.json({ ok: true });
});

router.all(["/logout", "/mobile-auth/logout"], (_req: Request, res: Response) => {
  clearSession(res);
  res.json({ success: true });
});

export default router;
