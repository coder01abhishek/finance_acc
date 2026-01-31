import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LayoutShell } from "@/components/layout-shell";
import { useAuth } from "@/hooks/use-simple-auth";
import { Loader2 } from "lucide-react";

import Dashboard from "@/pages/dashboard";
import TransactionsPage from "@/pages/transactions";
import AccountsPage from "@/pages/accounts";
import InvoicesPage from "@/pages/invoices";
import ReportsPage from "@/pages/reports";
import GoalsPage from "@/pages/goals";
import SettingsPage from "@/pages/settings";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <LayoutShell>
      <Component />
    </LayoutShell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
      {/* Protected Routes */}
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/transactions">
        <ProtectedRoute component={TransactionsPage} />
      </Route>
      <Route path="/accounts">
        <ProtectedRoute component={AccountsPage} />
      </Route>
      <Route path="/invoices">
        <ProtectedRoute component={InvoicesPage} />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={ReportsPage} />
      </Route>
      <Route path="/goals">
        <ProtectedRoute component={GoalsPage} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
