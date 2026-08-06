"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  Bell,
  ChefHat,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu as MenuIcon,
  ShoppingBag,
  User,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { useCart } from "@/lib/store/cart";
import { cn, initials } from "@/lib/utils";
import { STAFF_ROLES } from "@/types";
import type { Role } from "@prisma/client";

export function SiteHeader({ isOpenNow }: { isOpenNow: boolean }) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const count = useCart((s) => s.count());
  const hydrated = useCart((s) => s.hydrated);

  // Route change closes the drawer; without this it survives navigation.
  useEffect(() => setOpen(false), [pathname]);

  const isStaff = session?.user && STAFF_ROLES.includes(session.user.role as Role);

  const links = [
    { href: "/menu", label: t("menu") },
    { href: "/bookings", label: t("bookings") },
    { href: "/loyalty", label: t("loyalty") },
    { href: "/location", label: t("location") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <ChefHat className="size-6 text-primary" aria-hidden />
          <span className="text-base sm:text-lg">Schnitzy Haus</span>
        </Link>

        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium sm:inline-flex",
            isOpenNow
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-muted text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              isOpenNow ? "bg-emerald-600" : "bg-muted-foreground",
            )}
            aria-hidden
          />
          {isOpenNow ? tCommon("openNow") : tCommon("closed")}
        </span>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(link.href)
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <LocaleSwitcher className="hidden sm:inline-flex" />

          {session?.user && (
            <Button variant="ghost" size="icon" asChild aria-label={t("notifications")}>
              <Link href="/profile#notifications">
                <Bell />
              </Link>
            </Button>
          )}

          <Button variant="ghost" size="icon" asChild className="relative">
            <Link href="/cart" aria-label={`${t("cart")}${hydrated && count ? `, ${count}` : ""}`}>
              <ShoppingBag />
              {hydrated && count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>
          </Button>

          {session?.user ? (
            <div className="hidden items-center gap-1 md:flex">
              {isStaff && (
                <Button variant="ghost" size="icon" asChild aria-label={t("admin")}>
                  <Link href="/admin/dashboard">
                    <LayoutDashboard />
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" asChild aria-label={t("profile")}>
                <Link href="/profile">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {initials(session.user.firstName, session.user.lastName)}
                  </span>
                </Link>
              </Button>
            </div>
          ) : (
            <Button size="sm" asChild className="hidden md:inline-flex">
              <Link href="/auth/login">{t("signIn")}</Link>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X /> : <MenuIcon />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="animate-in border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col p-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}

            <div className="my-2 h-px bg-border" />

            {session?.user ? (
              <>
                {isStaff && (
                  <Link
                    href="/admin/dashboard"
                    className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                  >
                    <LayoutDashboard className="size-4" /> {t("admin")}
                  </Link>
                )}
                <Link
                  href="/orders"
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                >
                  <ShoppingBag className="size-4" /> {t("orders")}
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium hover:bg-muted"
                >
                  <User className="size-4" /> {t("profile")}
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-medium text-destructive hover:bg-muted"
                >
                  <LogOut className="size-4" /> {t("signOut")}
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 px-1 py-2">
                <Button asChild block>
                  <Link href="/auth/login">{t("signIn")}</Link>
                </Button>
                <Button asChild variant="outline" block>
                  <Link href="/auth/signup">{t("signUp")}</Link>
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between px-3 pt-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5" /> Kastanienallee 47, Berlin
              </span>
              <LocaleSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
