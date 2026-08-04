import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  Settings,
  ShieldAlert,
  Zap,
  Radio,
  FileText,
  Users,
  Cpu,
  Power,
  Clock,
  Menu,
  Bell,
  LogOut,
  User as UserIcon,
  HardDrive
} from "lucide-react";
import { MtiririkoLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/monitoring", label: "Live Monitoring", icon: Radio },
  { href: "/control", label: "Remote Control", icon: Power },
  { href: "/faults", label: "Fault Detection", icon: AlertTriangle },
  { href: "/events", label: "Event Timeline", icon: Clock },
  { href: "/scheduler", label: "Scheduler", icon: Calendar },
  { href: "/energy", label: "Energy Mgmt", icon: Zap },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/health", label: "Health Score", icon: ShieldAlert },
  { href: "/learning", label: "Adaptive Learning", icon: Cpu },
  { href: "/signature", label: "Electrical Signature", icon: Activity },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/firmware", label: "Firmware OTA", icon: HardDrive },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <div className="flex flex-col gap-1 w-full">
      {NAV_ITEMS.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href} onClick={onClick}>
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium cursor-pointer",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground opacity-70")} />
              {item.label}
            </div>
          </Link>
        );
      })}

      {user?.role === "administrator" && (
        <Link href="/users" onClick={onClick}>
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium mt-4 border border-sidebar-border cursor-pointer",
              location === "/users"
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Users className="w-4 h-4 opacity-70" />
            User Management
          </div>
        </Link>
      )}
    </div>
  );

  const Brand = () => (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
        <MtiririkoLogo size={18} />
      </div>
      <span className="font-bold tracking-tight text-sidebar-foreground text-sm">Mtiririko</span>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-full bg-sidebar border-r border-sidebar-border shadow-sm z-10 flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <Brand />
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          <NavLinks />
        </div>

        <div className="p-4 border-t border-sidebar-border flex flex-col gap-2">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center border border-sidebar-border flex-shrink-0">
              <UserIcon className="w-4 h-4 text-sidebar-foreground" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-sidebar-foreground truncate">{user?.username}</span>
              <span className="text-xs text-sidebar-foreground opacity-60 capitalize truncate">{user?.role}</span>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={() => logout()}>
            <LogOut className="w-4 h-4 mr-2" />
            Log out
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Navbar */}
        <header className="h-16 flex-shrink-0 border-b border-border bg-card flex items-center justify-between px-4 lg:px-8 z-10">
          <div className="flex items-center gap-4">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-sidebar border-r-sidebar-border">
                <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
                  <Brand />
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100vh-4rem)]">
                  <NavLinks onClick={() => setMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold tracking-tight hidden sm:block capitalize">
              {location === "/" ? "Dashboard" : location.substring(1).replace("-", " ")}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium border border-border">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              System Online
            </div>

            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative cursor-pointer">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-destructive border border-card" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto bg-background p-4 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
