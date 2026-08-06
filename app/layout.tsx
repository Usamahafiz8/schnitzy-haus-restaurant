import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Schnitzy Haus — hand-breaded schnitzel, ordered in seconds",
    template: "%s · Schnitzy Haus",
  },
  description:
    "Order schnitzel for pickup or delivery, book a table, and earn points on every meal. Hand-breaded daily, fried to order.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Schnitzy Haus",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    siteName: "Schnitzy Haus",
    title: "Schnitzy Haus",
    description: "Hand-breaded schnitzel, fried to order. Delivery, pickup and tables.",
  },
  formatDetection: { telephone: true, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffdf9" },
    { media: "(prefers-color-scheme: dark)", color: "#241f1b" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <SessionProvider>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
            >
              Skip to content
            </a>
            {children}
            <Toaster
              position="top-center"
              richColors
              closeButton
              toastOptions={{ duration: 4000 }}
            />
          </NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
