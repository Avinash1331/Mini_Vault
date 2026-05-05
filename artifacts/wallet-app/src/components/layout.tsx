import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  ListOrdered, 
  BookOpen, 
  Bell, 
  ShieldAlert, 
  Users, 
  Activity, 
  LogOut,
  TerminalSquare
} from "lucide-react";
import { Button } from "./ui/button";

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/transfer", label: "Transfer", icon: ArrowRightLeft },
    { href: "/transactions", label: "Transactions", icon: ListOrdered },
    { href: "/ledger", label: "Ledger", icon: BookOpen },
    { href: "/notifications", label: "Alerts", icon: Bell },
  ];

  const adminItems = [
    { href: "/admin", label: "Command Center", icon: Activity },
    { href: "/admin/transactions", label: "All Transfers", icon: ListOrdered },
    { href: "/admin/users", label: "User Directory", icon: Users },
    { href: "/admin/fraud", label: "Fraud Feed", icon: ShieldAlert },
    { href: "/simulate", label: "Simulation", icon: TerminalSquare },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r border-border bg-card/30 backdrop-blur-md">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/50 shadow-[0_0_10px_rgba(20,184,166,0.2)]">
              <ShieldAlert className="h-4 w-4 text-primary" />
            </div>
            <span className="font-mono font-bold tracking-tight text-lg">VAULT<span className="text-primary">X</span></span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-mono px-2 mb-2">Personal</h2>
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer font-mono text-sm ${
                    isActive 
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                  }`}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </div>

          {user?.role === "admin" && (
            <div className="space-y-2">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-mono px-2 mb-2">System Admin</h2>
              {adminItems.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer font-mono text-sm ${
                      isActive 
                        ? "bg-destructive/10 text-destructive border border-destructive/20" 
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                    }`}>
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between px-2 mb-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user?.name}</span>
              <span className="text-xs text-muted-foreground font-mono truncate w-32">{user?.email}</span>
            </div>
            {user?.role === "admin" && (
              <span className="text-[9px] uppercase font-mono bg-destructive/20 text-destructive px-1.5 py-0.5 rounded">Admin</span>
            )}
          </div>
          <Button variant="outline" className="w-full justify-start border-border text-muted-foreground font-mono text-xs hover:text-foreground" onClick={() => { logout(); }}>
            <LogOut className="mr-2 h-4 w-4" />
            DISCONNECT
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden h-14 border-b border-border flex items-center justify-between px-4 bg-card/30 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-primary/20 rounded flex items-center justify-center border border-primary/50">
              <ShieldAlert className="h-3 w-3 text-primary" />
            </div>
            <span className="font-mono font-bold tracking-tight">VAULT<span className="text-primary">X</span></span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => logout()}>
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none"></div>
          <div className="relative z-10 max-w-6xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden border-t border-border bg-card/50 backdrop-blur-md pb-safe">
          <div className="flex items-center justify-around p-2">
            {navItems.slice(0, 4).map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`flex flex-col items-center gap-1 p-2 rounded-md ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-mono">{item.label}</span>
                  </div>
                </Link>
              );
            })}
            {user?.role === "admin" && (
              <Link href="/admin">
                <div className={`flex flex-col items-center gap-1 p-2 rounded-md ${location.startsWith("/admin") ? "text-destructive" : "text-muted-foreground"}`}>
                  <Activity className="h-5 w-5" />
                  <span className="text-[10px] font-mono">Admin</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
