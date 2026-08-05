import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
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
  HardDrive,
  ChevronLeft,
  Sun,
  Moon,
  ShieldCheck,
  UserCog,
  Wrench,
  Eye as EyeIcon,
} from "lucide-react";
import { MtiririkoLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { title: string; items: NavItem[] };
type Role = "administrator" | "technician" | "maintenance" | "viewer";

const ROLE_META: Record<Role, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}> = {
  administrator: { label: "Administrator", icon: ShieldCheck, color: "text-primary",                    bg: "bg-primary/10 border-primary/30"              },
  technician:    { label: "Technician",    icon: UserCog,     color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30"            },
  maintenance:   { label: "Maintenance",   icon: Wrench,      color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/30"          },
  viewer:        { label: "Viewer",        icon: EyeIcon,     color: "text-muted-foreground",              bg: "bg-secondary border-border"                   },
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Operations",
    items: [
      { href: "/", label: "Dashboard", icon: Activity },
      { href: "/monitoring", label: "Live Monitoring", icon: Radio },
      { href: "/control", label: "Remote Control", icon: Power },
    ],
  },
  {
    title: "Protection",
    items: [
      { href: "/faults", label: "Fault Detection", icon: AlertTriangle },
      { href: "/events", label: "Event Timeline", icon: Clock },
      { href: "/health", label: "Health Score", icon: ShieldAlert },
    ],
  },
  {
    title: "Optimisation",
    items: [
      { href: "/scheduler", label: "Scheduler", icon: Calendar },
      { href: "/energy", label: "Energy Management", icon: Zap },
      { href: "/learning", label: "Adaptive Learning", icon: Cpu },
      { href: "/signature", label: "Electrical Signature", icon: Activity },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/firmware", label: "Firmware OTA", icon: HardDrive },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/monitoring": "Live Monitoring",
  "/control": "Remote Control",
  "/faults": "Fault Detection",
  "/events": "Event Timeline",
  "/health": "Health Score",
  "/scheduler": "Scheduler",
  "/energy": "Energy Management",
  "/learning": "Adaptive Learning",
  "/signature": "Electrical Signature",
  "/analytics": "Analytics",
  "/reports": "Reports",
  "/settings": "Settings",
  "/firmware": "Firmware OTA",
  "/notifications": "Notifications",
  "/users": "User Management",
};

function NavIconTooltip({ label, collapsed, children }: { label: string; collapsed: boolean; children: React.ReactNode }) {
  if (!collapsed) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs font-medium">{label}</TooltipContent>
    </Tooltip>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const pageTitle = PAGE_TITLES[location] ?? location.substring(1).replace(/-/g, " ");

  const allNavItems: NavItem[] = [
    ...NAV_SECTIONS.flatMap(s => s.items),
    ...(user?.role === "administrator" ? [{ href: "/users", label: "User Management", icon: Users }] : []),
  ];

  /* Full-width nav links used in mobile Sheet */
  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <div className="flex flex-col gap-5 w-full">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="px-3 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 select-none">
              {section.title}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} onClick={onClick}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium cursor-pointer group",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}>
                    <item.icon className={cn("w-4 h-4 shrink-0 transition-opacity", isActive ? "opacity-100" : "opacity-50 group-hover:opacity-80")} />
                    <span className="truncate">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {user?.role === "administrator" && (
        <div>
          <div className="px-3 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 select-none">Admin</span>
          </div>
          <Link href="/users" onClick={onClick}>
            <div className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium cursor-pointer group",
              location === "/users"
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}>
              <Users className="w-4 h-4 shrink-0 opacity-50 group-hover:opacity-80" />
              User Management
            </div>
          </Link>
        </div>
      )}
    </div>
  );

  const Brand = () => (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-md bg-primary/90 flex items-center justify-center text-primary-foreground shadow-sm shrink-0">
        <MtiririkoLogo size={16} />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-bold tracking-tight text-sidebar-foreground text-sm">Mtiririko</span>
        <span className="text-[10px] text-sidebar-foreground/40 tracking-wide font-medium">PUMP CONTROL</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">

      {/* ── Desktop Sidebar ────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-full bg-sidebar border-r border-sidebar-border shadow-sm z-10 flex-shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden",
          collapsed ? "w-[60px]" : "w-60"
        )}
      >
        {/* Brand / toggle */}
        <div
          className={cn(
            "h-14 flex items-center border-b border-sidebar-border/60 cursor-pointer select-none group transition-all",
            collapsed ? "justify-center px-0" : "px-5 justify-between"
          )}
          onClick={() => setCollapsed(prev => !prev)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <div className="w-7 h-7 rounded-md bg-primary/90 flex items-center justify-center text-primary-foreground shadow-sm shrink-0 group-hover:bg-primary transition-colors">
              <MtiririkoLogo size={16} />
            </div>
          ) : (
            <>
              <Brand />
              <ChevronLeft className="w-4 h-4 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-colors" />
            </>
          )}
        </div>

        {/* Nav items */}
        <div className={cn("flex-1 overflow-y-auto py-4 scrollbar-hide", collapsed ? "px-2" : "px-3")}>
          {collapsed ? (
            /* Icon-only mode */
            <div className="flex flex-col gap-1">
              {allNavItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <NavIconTooltip key={item.href} label={item.label} collapsed>
                    <Link href={item.href}>
                      <div className={cn(
                        "w-full flex items-center justify-center h-9 w-9 rounded-md transition-all cursor-pointer mx-auto",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}>
                        <item.icon className="w-4 h-4 shrink-0" />
                      </div>
                    </Link>
                  </NavIconTooltip>
                );
              })}
            </div>
          ) : (
            <NavLinks />
          )}
        </div>

        {/* Footer — user + logout */}
        <SidebarFooter collapsed={collapsed} user={user} onLogout={logout} />
      </aside>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Top Navbar */}
        <header className="h-14 flex-shrink-0 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 z-10">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                  <Menu className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 bg-sidebar border-r-sidebar-border">
                <div className="h-14 flex items-center px-5 border-b border-sidebar-border/60">
                  <Brand />
                </div>
                <div className="p-3 overflow-y-auto scrollbar-hide h-[calc(100vh-3.5rem)]">
                  <NavLinks onClick={() => setMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            <h1 className="text-sm font-semibold tracking-tight text-foreground hidden sm:block capitalize">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/8 text-primary border border-primary/15 text-xs font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Online
            </div>
            <ThemeToggle />
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative h-8 w-8 cursor-pointer">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-destructive border border-card" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto bg-background p-4 lg:p-6 scrollbar-hide">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Sidebar Footer ───────────────────────────────────────────────────────────

function SidebarFooter({
  collapsed,
  user,
  onLogout,
}: {
  collapsed: boolean;
  user: ReturnType<typeof useAuth>["user"];
  onLogout: () => void;
}) {
  const roleMeta = user ? ROLE_META[user.role as Role] : null;
  const RoleIcon = roleMeta?.icon ?? UserIcon;

  if (collapsed) {
    return (
      <div className={cn("border-t border-sidebar-border/60 p-2")}>
        <div className="flex flex-col items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center border cursor-default",
                roleMeta ? roleMeta.bg : "bg-sidebar-accent border-sidebar-border",
              )}>
                <RoleIcon className={cn("w-4 h-4", roleMeta?.color ?? "text-sidebar-foreground/70")} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              <p className="font-medium">{user?.username}</p>
              <p className={cn("font-medium", roleMeta?.color)}>{roleMeta?.label ?? user?.role}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onLogout}
                className="w-9 h-9 flex items-center justify-center rounded-md text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Log out</TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-sidebar-border/60 p-3">
      <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
        <div className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center border flex-shrink-0",
          roleMeta ? roleMeta.bg : "bg-sidebar-accent border-sidebar-border",
        )}>
          <RoleIcon className={cn("w-3.5 h-3.5", roleMeta?.color ?? "text-sidebar-foreground/70")} />
        </div>
        <div className="flex flex-col overflow-hidden min-w-0">
          <span className="text-sm font-medium text-sidebar-foreground truncate leading-tight">{user?.username}</span>
          <span className={cn("text-[11px] truncate leading-tight font-medium", roleMeta?.color ?? "text-sidebar-foreground/40")}>
            {roleMeta?.label ?? user?.role}
          </span>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
      >
        <LogOut className="w-3.5 h-3.5 shrink-0" />
        Log out
      </button>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      aria-label="Toggle colour scheme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark"
        ? <Sun  className="w-4 h-4" />
        : <Moon className="w-4 h-4" />}
    </Button>
  );
}
