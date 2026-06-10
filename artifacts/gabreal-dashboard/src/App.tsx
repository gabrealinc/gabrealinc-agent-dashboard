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

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg, #fdf6f0)" }}>
        <p style={{ fontFamily: "var(--font-body, Inter, sans-serif)", color: "var(--text-muted, #9c7a6a)" }}>Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "1.5rem", background: "var(--bg, #fdf6f0)" }}>
        <h1 style={{ fontFamily: "var(--font-heading, 'Playfair Display', serif)", fontSize: "2rem", color: "var(--text, #3d2c2c)" }}>Gabreal Command Center</h1>
        <button
          onClick={login}
          style={{ padding: "0.75rem 2rem", background: "var(--accent, #e07a5f)", color: "#fff", border: "none", borderRadius: "0.5rem", fontFamily: "var(--font-body, Inter, sans-serif)", fontSize: "1rem", cursor: "pointer" }}
        >
          Log in
        </button>
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
