"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Bookmark,
  CalendarDays,
  Compass,
  Home,
  LogOut,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/messages", label: "Messages", icon: Mail },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Five most-used items for the mobile bottom bar
const MOBILE_NAV = [NAV[0], NAV[1], NAV[2], NAV[3], NAV[7]];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Send signed-out visitors to the login page
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Remember the sidebar state between visits
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
    } catch {
      /* storage unavailable: keep default */
    }
  }, []);

  function toggleSidebar() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:hidden">
        <span className="font-semibold">Social Platform</span>
        <Link href="/settings" aria-label="Settings">
          <Settings className="size-5" />
        </Link>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Left sidebar (tablet and desktop) */}
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col border-r p-3 transition-[width] duration-200 md:flex",
            collapsed ? "w-[72px]" : "w-64",
          )}
        >
          <div
            className={cn(
              "mb-4 flex items-center px-1 pt-2",
              collapsed ? "justify-center" : "justify-between",
            )}
          >
            {!collapsed && (
              <span className="pl-2 text-lg font-semibold">
                Social Platform
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-5" />
              ) : (
                <PanelLeftClose className="size-5" />
              )}
            </Button>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted",
                  isActive(href) && "bg-muted font-semibold",
                  collapsed && "justify-center px-0",
                )}
              >
                <Icon className="size-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            ))}
          </nav>

          <div className="border-t pt-3">
            {!collapsed && (
              <p className="truncate px-2 pb-2 text-sm text-muted-foreground">
                @{user.username}
              </p>
            )}
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3",
                collapsed && "justify-center px-0",
              )}
              onClick={() => logout()}
              title={collapsed ? "Sign out" : undefined}
            >
              <LogOut className="size-5 shrink-0" />
              {!collapsed && "Sign out"}
            </Button>
          </div>
        </aside>

        {/* Center column */}
        <main className="min-h-screen min-w-0 flex-1 border-r pb-20 md:pb-0">
          {children}
        </main>

        {/* Right panel (large screens) */}
        <aside className="hidden w-80 shrink-0 space-y-4 p-4 lg:block">
          {["Suggested users", "Trending hashtags", "Upcoming events"].map(
            (title) => (
              <section key={title} className="rounded-2xl border p-4">
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nothing here yet.
                </p>
              </section>
            ),
          )}
        </aside>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center justify-around border-t bg-background md:hidden">
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              "flex h-full flex-1 items-center justify-center",
              isActive(href) ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-6" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
