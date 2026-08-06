"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarDays, Home, Receipt, ShoppingBag, UtensilsCrossed } from "lucide-react";

import { useCart } from "@/lib/store/cart";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  key: "home" | "menu" | "cart" | "bookings" | "orders";
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/", key: "home", icon: Home, exact: true },
  { href: "/menu", key: "menu", icon: UtensilsCrossed },
  { href: "/cart", key: "cart", icon: ShoppingBag, badge: true },
  { href: "/bookings", key: "bookings", icon: CalendarDays },
  { href: "/orders", key: "orders", icon: Receipt },
];

/** Primary navigation on phones — 80% of traffic, per the brief. */
export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const count = useCart((s) => s.count());
  const hydrated = useCart((s) => s.hydrated);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-5" aria-hidden />
                  {item.badge && hydrated && count > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
