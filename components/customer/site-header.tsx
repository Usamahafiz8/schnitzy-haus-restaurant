"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/store/cart";
import { cn, initials } from "@/lib/utils";
import { STAFF_ROLES } from "@/types";
import type { Role } from "@prisma/client";

const NAV = [
  { href: "/", key: "home", exact: true },
  { href: "/menu", key: "menu" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
  { href: "/locations", key: "locations" },
] as const;

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const count = useCart((s) => s.count());
  const hydrated = useCart((s) => s.hydrated);

  // Route change closes both overlays; without this they survive navigation.
  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const isStaff = session?.user && STAFF_ROLES.includes(session.user.role as Role);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/menu?q=${encodeURIComponent(q)}` : "/menu");
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Schnitzy Haus — home" className="shrink-0">
          <Logo className="hidden sm:inline-flex" />
          <Logo compact className="sm:hidden" />
        </Link>

        {/* --------------------------------------------------------------- nav */}
        <nav className="ml-auto hidden items-center gap-7 lg:flex" aria-label="Main">
          {NAV.map((item) => {
            const active = isActive(item.href, "exact" in item && item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative py-1 text-[13px] font-bold uppercase tracking-wider transition-colors",
                  active
                    ? "text-primary"
                    : "text-foreground/80 hover:text-primary",
                )}
              >
                {t(item.key)}
                {active && (
                  <span className="absolute -bottom-0.5 left-0 h-0.5 w-full rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ------------------------------------------------------------ actions */}
        <div className="ml-auto flex items-center gap-1 lg:ml-0 lg:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label={t("search")}
            aria-expanded={searchOpen}
            className="hidden sm:inline-flex"
          >
            <Search />
          </Button>

          <Button variant="ghost" size="icon" asChild className="relative">
            <Link
              href="/cart"
              aria-label={`${t("cart")}${hydrated && count ? `, ${count}` : ""}`}
            >
              <ShoppingBag />
              {hydrated && count > 0 && (
                <span className="absolute right-0.5 top-1 flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>
          </Button>

          {session?.user ? (
            <div className="hidden items-center gap-1 lg:flex">
              {isStaff && (
                <Button variant="ghost" size="icon" asChild aria-label={t("admin")}>
                  <Link href="/admin/dashboard">
                    <LayoutDashboard />
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" asChild aria-label={t("profile")}>
                <Link href="/profile">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {initials(session.user.firstName, session.user.lastName)}
                  </span>
                </Link>
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" asChild className="hidden lg:inline-flex" aria-label={t("signIn")}>
              <Link href="/auth/login">
                <User />
              </Link>
            </Button>
          )}

          {/* Never hidden: this is the button the whole page exists to get pressed. */}
          <Button asChild size="sm" className="shrink-0 uppercase sm:h-11 sm:px-4 sm:text-sm">
            <Link href="/menu">{t("orderNow")}</Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("menu")}
            aria-expanded={open}
          >
            {open ? <X /> : <MenuIcon />}
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- search */}
      {searchOpen && (
        <div className="animate-in border-t border-border bg-background">
          <form
            onSubmit={submitSearch}
            className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:px-6"
          >
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="sm">
              {t("search")}
            </Button>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- drawer */}
      {open && (
        <div className="animate-in border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col p-3 sm:px-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-3 text-sm font-bold uppercase tracking-wider",
                  isActive(item.href, "exact" in item && item.exact)
                    ? "bg-brand-50 text-primary"
                    : "hover:bg-muted",
                )}
              >
                {t(item.key)}
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
                  <Link href="/menu">{t("orderNow")}</Link>
                </Button>
                <Button asChild variant="outline" block>
                  <Link href="/auth/login">{t("signIn")}</Link>
                </Button>
              </div>
            )}

            <div className="px-3 pt-3">
              <LocaleSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
