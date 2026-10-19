import crypto from "node:crypto";
import { type Request, type Response } from "express";
import type { AuthUser } from "@workspace/api-zod";

export const SESSION_COOKIE = "gabreal_dashboard_session";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export interface SessionData {
  user: AuthUser;
  expiresAt: number;
}

function signingSecret(): string {
  const secret = process.env.SESSION_SECRET ?? process.env.DASHBOARD_PASSWORD;
  if (!secret) throw new Error("SESSION_SECRET or DASHBOARD_PASSWORD must be configured");
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function createSession(user: AuthUser): string {
  const payload = Buffer.from(JSON.stringify({
    user,
    expiresAt: Date.now() + SESSION_TTL,
  } satisfies SessionData)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function getSession(token: string): SessionData | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionData;
    if (!session.user?.id || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export function clearSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return req.cookies?.[SESSION_COOKIE];
}
