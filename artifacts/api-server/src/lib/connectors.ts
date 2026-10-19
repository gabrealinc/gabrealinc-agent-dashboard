import { ReplitConnectors } from "@replit/connectors-sdk";

export interface ConnectorClient {
  proxy(service: string, path: string, init?: RequestInit): Promise<ConnectorResponse>;
}

type ConnectorResponse = Omit<Response, "json"> & { json(): Promise<any> };

let googleTokenCache: { token: string; expiresAt: number } | null = null;

async function googleAccessToken(): Promise<string | null> {
  if (googleTokenCache && googleTokenCache.expiresAt > Date.now() + 60_000) {
    return googleTokenCache.token;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return process.env.GOOGLE_ACCESS_TOKEN ?? null;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error("Could not refresh the Google Calendar connection");

  const data = await response.json() as { access_token: string; expires_in?: number };
  googleTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

export class DashboardConnectors implements ConnectorClient {
  async proxy(service: string, path: string, init: RequestInit = {}): Promise<ConnectorResponse> {
    if (service === "notion" && process.env.NOTION_TOKEN) {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${process.env.NOTION_TOKEN}`);
      headers.set("Notion-Version", "2022-06-28");
      return fetch(`https://api.notion.com${path}`, { ...init, headers });
    }

    if (service === "google-calendar") {
      const accessToken = await googleAccessToken();
      if (accessToken) {
        const headers = new Headers(init.headers);
        headers.set("Authorization", `Bearer ${accessToken}`);
        return fetch(`https://www.googleapis.com${path}`, { ...init, headers });
      }
    }

    const replitInit = {
      ...init,
      headers: Object.fromEntries(new Headers(init.headers).entries()),
    };
    return new ReplitConnectors().proxy(service, path, replitInit) as Promise<ConnectorResponse>;
  }
}
