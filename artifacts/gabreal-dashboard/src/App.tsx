import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = React.useState<boolean | null>(null);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/auth/user", { credentials: "include" })
      .then(r => setAuthed(r.ok))
      .catch(() => setAuthed(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/password-login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthed(true);
      } else {
        setError("Incorrect password. Try again.");
        setPassword("");
      }
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authed === null) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ fontFamily: "Inter, sans-serif", color: "#9c7a6a", fontSize: 15 }}>Loading…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg, #fdf6ee)" }}>
        <div style={{
          background: "rgba(255, 248, 242, 0.96)",
          borderRadius: 24,
          padding: "52px 44px 44px",
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 8px 48px rgba(180,100,60,0.13)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 52,
            fontWeight: 700,
            color: "#2d1a0e",
            margin: "0 0 6px",
            lineHeight: 1.1,
            letterSpacing: "-0.5px",
          }}>Gab Real</h1>
          <p style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.22em",
            color: "#9c7a6a",
            margin: "0 0 40px",
            textTransform: "uppercase",
          }}>Command Center</p>

          <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              autoFocus
              style={{
                width: "100%",
                padding: "15px 20px",
                borderRadius: 999,
                border: "1.5px solid rgba(200,150,110,0.25)",
                background: "rgba(255, 248, 240, 0.8)",
                fontFamily: "Inter, sans-serif",
                fontSize: 15,
                color: "#3d2010",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {error && (
              <p style={{ margin: "0 4px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#c0522a" }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting || !password}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: 999,
                border: "none",
                background: submitting || !password
                  ? "rgba(200,150,110,0.4)"
                  : "linear-gradient(to right, #d05a28, #e8a84a)",
                color: "#fff",
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                fontSize: 16,
                cursor: submitting || !password ? "default" : "pointer",
                letterSpacing: "0.02em",
                transition: "opacity 0.15s",
              }}
            >
              {submitting ? "…" : "Enter"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGate>
            <Router />
          </AuthGate>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
