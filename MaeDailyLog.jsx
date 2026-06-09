// ─────────────────────────────────────────────────────────────────────────────
// MaeDailyLog — reads Mae's latest daily sync log and shows it on the dashboard.
// Drop <MaeDailyLog /> into your layout (e.g. on the home tab or a Systems tab).
// Pairs with the `mae-daily-log` Supabase edge function and the /api/mae-daily-log
// proxy route in server.js.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

const BRAND = {
  surface: "#1A1A1A",
  border: "#2A2A2A",
  accent: "#C8B59A",
  text: "#F0EBE3",
  textMuted: "#888",
  flag: "#D4A843",
  flagSoft: "#D4A84320",
};

function timeAgo(iso) {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function MaeDailyLog() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mae-daily-log");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError("Could not load Mae's log");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div
      style={{
        background: BRAND.surface,
        border: `1px solid ${BRAND.border}`,
        borderRadius: 14,
        padding: 20,
        color: BRAND.text,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: 0.2 }}>Mae's Daily Log</span>
          {data?.flaggedCount > 0 && (
            <span
              style={{
                background: BRAND.flagSoft,
                color: BRAND.flag,
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
              }}
            >
              {data.flaggedCount} need{data.flaggedCount === 1 ? "s" : ""} your eye
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {data?.updatedAt && (
            <span style={{ fontSize: 12, color: BRAND.textMuted }}>synced {timeAgo(data.updatedAt)}</span>
          )}
          <button
            onClick={load}
            style={{
              background: "transparent",
              border: `1px solid ${BRAND.border}`,
              color: BRAND.textMuted,
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && <div style={{ color: BRAND.textMuted, fontSize: 13 }}>Loading…</div>}
      {error && <div style={{ color: "#E05555", fontSize: 13 }}>{error}</div>}

      {!loading && !error && data?.lines?.length === 0 && (
        <div style={{ color: BRAND.textMuted, fontSize: 13 }}>No log yet. Mae writes here after her next run.</div>
      )}

      {!loading && !error && data?.lines?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
          {data.lines.map((line, i) => {
            const isHeading = line.type?.startsWith("heading");
            return (
              <div
                key={i}
                style={{
                  fontSize: isHeading ? 13.5 : 13,
                  fontWeight: isHeading ? 600 : 400,
                  lineHeight: 1.5,
                  color: line.flagged ? BRAND.flag : isHeading ? BRAND.accent : BRAND.text,
                  background: line.flagged ? BRAND.flagSoft : "transparent",
                  borderLeft: line.flagged ? `2px solid ${BRAND.flag}` : "2px solid transparent",
                  padding: line.flagged ? "4px 10px" : "1px 0",
                  borderRadius: line.flagged ? 4 : 0,
                  marginTop: isHeading ? 8 : 0,
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
