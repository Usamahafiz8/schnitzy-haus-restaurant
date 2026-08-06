import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

const STAFF_ROLES = new Set(["ADMIN", "STAFF", "KITCHEN", "DELIVERY"]);

/**
 * Routes that require an account.
 *
 * `/bookings` and `/checkout` are deliberately absent: both work for guests
 * (the booking and order APIs accept a null customer), and forcing a sign-up
 * between a hungry customer and their table is the fastest way to lose them.
 * The signed-in-only parts of those pages hide themselves.
 */
const CUSTOMER_PROTECTED = ["/orders", "/loyalty", "/profile"];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const user = req.auth?.user;

  const isAuthPage = pathname.startsWith("/auth");
  const isAdminArea = pathname.startsWith("/admin");
  const needsLogin = CUSTOMER_PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Signed-in users have no business on the login/signup screens.
  if (isAuthPage && user) {
    const target = STAFF_ROLES.has(user.role) ? "/admin/dashboard" : "/";
    return NextResponse.redirect(new URL(target, req.nextUrl));
  }

  if ((isAdminArea || needsLogin) && !user) {
    const url = new URL("/auth/login", req.nextUrl);
    url.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // Customers hitting the dashboard get bounced rather than shown a 403 shell.
  if (isAdminArea && user && !STAFF_ROLES.has(user.role)) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Everything except static assets, image optimisation, and the Stripe
    // webhook (which authenticates with a signature, not a session).
    "/((?!api/payment/webhook|_next/static|_next/image|favicon.ico|icons|images|manifest.webmanifest|sw.js|firebase-messaging-sw.js).*)",
  ],
};
