"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChefHat,
  Home,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  Menu as MenuIcon,
  MessageSquare,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Ticket,
  Users,
  X,
} from "lucide-react";

import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";
import type { Role } from "@prisma/client";

type NavEntry = {
  href: string;
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: "orders" | "reviews" | "support";
  roles?: Role[];
};

/**
 * Role decides what a screen shows. Kitchen staff get orders; only admins see
 * money, staff management and settings.
 */
const NAV: NavEntry[] = [
  { href: "/admin/dashboard", key: "dashboard", icon: Home },
  { href: "/admin/orders", key: "orders", icon: ShoppingBag, badge: "orders" },
  { href: "/admin/bookings", key: "bookings", icon: CalendarDays, roles: ["ADMIN", "STAFF"] },
  { href: "/admin/tables", key: "tables", icon: LayoutGrid, roles: ["ADMIN", "STAFF"] },
  { href: "/admin/reviews", key: "reviews", icon: Star, badge: "reviews", roles: ["ADMIN", "STAFF"] },
  { href: "/admin/loyalty", key: "loyalty", icon: Sparkles, roles: ["ADMIN"] },
  { href: "/admin/coupons", key: "coupons", icon: Ticket, roles: ["ADMIN"] },
  { href: "/admin/analytics", key: "analytics", icon: BarChart3, roles: ["ADMIN"] },
  { href: "/admin/support", key: "support", icon: LifeBuoy, badge: "support", roles: ["ADMIN", "STAFF"] },
  { href: "/admin/staff", key: "staff", icon: Users, roles: ["ADMIN"] },
  { href: "/admin/settings", key: "settings", icon: Settings, roles: ["ADMIN"] },
];

export function AdminShell({
  user,
  restaurantName,
  badges,
  children,
}: {
  user: { firstName: string; lastName: string; email: string; role: Role };
  restaurantName: string;
  badges: { orders: number; reviews: number; support: number };
  children: React.ReactNode;
}) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const visible = NAV.filter((entry) => !entry.roles || entry.roles.includes(user.role));

  const nav = (
    <nav className="flex flex-col gap-0.5 p-3" aria-label="Dashboard">
      {visible.map((entry) => {
        const active = pathname.startsWith(entry.href);
        const Icon = entry.icon;
        const count = entry.badge ? badges[entry.badge] : 0;

        return (
          <Link
            key={entry.href}
            href={entry.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{t(entry.key)}</span>
            {count > 0 && (
              <Badge variant={active ? "neutral" : "danger"} className="shrink-0">
                {count}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-muted/30">
      {/* --------------------------------------------------- desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5 font-semibold">
          <ChefHat className="size-5 text-primary" aria-hidden />
          <span className="truncate">{restaurantName}</span>
        </div>

        <div className="flex-1 overflow-y-auto">{nav}</div>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials(user.firstName, user.lastName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {t(`roles.${user.role}`)}
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 px-1">
            <LocaleSwitcher />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => signOut({ callbackUrl: "/" })}
              aria-label="Sign out"
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------ content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-md lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X /> : <MenuIcon />}
          </Button>

          <span className="flex items-center gap-2 font-semibold">
            <ChefHat className="size-5 text-primary" aria-hidden />
            {restaurantName}
          </span>

          <Button variant="ghost" size="icon" asChild className="ml-auto" aria-label="Storefront">
            <Link href="/">
              <MessageSquare />
            </Link>
          </Button>
        </header>

        {open && (
          <div className="animate-in border-b border-border bg-background lg:hidden">
            {nav}
            <div className="flex items-center justify-between border-t border-border p-3">
              <LocaleSwitcher />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut aria-hidden />
                Sign out
              </Button>
            </div>
          </div>
        )}

        <main id="main" className="min-w-0 flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
