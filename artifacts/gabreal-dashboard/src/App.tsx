import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";
import { useAuth } from "@workspace/replit-auth-web";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, login } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
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
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error === "DASHBOARD_PASSWORD not configured"
          ? "Password login not configured."
          : "Incorrect password. Try again.");
        setPassword("");
      }
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ fontFamily: "Inter, sans-serif", color: "#9c7a6a", fontSize: 15 }}>Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg, #fdf6ee)" }}>
        <div style={{
          background: "rgba(255, 248, 242, 0.96)",
          borderRadius: 24,
          padding: "52px 44px 44px",
          width: "100%",
          maxWidth: 460,
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
            margin: "0 0 36px",
            textTransform: "uppercase",
          }}>Command Center</p>

          {/* Primary: Replit OIDC login */}
          {!showPassword && (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                onClick={() => login()}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: 999,
                  border: "none",
                  background: "linear-gradient(to right, #d05a28, #e8a84a)",
                  color: "#fff",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                }}
              >
                Sign in with Replit
              </button>
              <button
                onClick={() => setShowPassword(true)}
                style={{
                  background: "none",
                  border: "none",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  color: "#9c7a6a",
                  cursor: "pointer",
                  marginTop: 4,
                  textDecoration: "underline",
                }}
              >
                Use password instead
              </button>
            </div>
          )}

          {/* Fallback: password login */}
          {showPassword && (
            <form onSubmit={handlePasswordSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
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
              <button
                type="button"
                onClick={() => { setShowPassword(false); setError(""); setPassword(""); }}
                style={{
                  background: "none",
                  border: "none",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  color: "#9c7a6a",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                ← Back
              </button>
            </form>
          )}
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
