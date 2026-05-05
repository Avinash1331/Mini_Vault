import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";

import AuthPage from "./pages/auth";
import DashboardPage from "./pages/dashboard";
import TransferPage from "./pages/transfer";
import TransactionsPage from "./pages/transactions";
import LedgerPage from "./pages/ledger";
import NotificationsPage from "./pages/notifications";
import SimulatePage from "./pages/simulate";

import AdminDashboardPage from "./pages/admin/dashboard";
import AdminTransactionsPage from "./pages/admin/transactions";
import AdminUsersPage from "./pages/admin/users";
import AdminFraudPage from "./pages/admin/fraud";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  return <Component {...rest} />;
}

function AppRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <Switch>
      <Route path="/" component={() => (user ? <Redirect to="/dashboard" /> : <Redirect to="/login" />)} />
      <Route path="/login" component={() => <AuthPage defaultTab="login" />} />
      <Route path="/register" component={() => <AuthPage defaultTab="register" />} />
      
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/transfer" component={TransferPage} />
      <ProtectedRoute path="/transactions" component={TransactionsPage} />
      <ProtectedRoute path="/ledger" component={LedgerPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      
      <ProtectedRoute path="/simulate" component={SimulatePage} adminOnly={true} />
      
      <ProtectedRoute path="/admin" component={AdminDashboardPage} adminOnly={true} />
      <ProtectedRoute path="/admin/transactions" component={AdminTransactionsPage} adminOnly={true} />
      <ProtectedRoute path="/admin/users" component={AdminUsersPage} adminOnly={true} />
      <ProtectedRoute path="/admin/fraud" component={AdminFraudPage} adminOnly={true} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("dark");
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
