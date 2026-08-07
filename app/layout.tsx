import type { Metadata, Viewport } from "next";
import { Anton, DM_Sans, Kaushan_Script } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import "./globals.css";

// Poster condensed for the big statements, brush script for the two
// handwritten accents, and a humanist sans for everything you actually read.
const display = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display-face",
  display: "swap",
});

const script = Kaushan_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script-face",
  display: "swap",
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Schnitzy Haus — Premium Burgers & Bowls in Frankfurt",
    template: "%s · Schnitzy Haus",
  },
  description:
    "Handgemachte Burger, knusprige Schnitzel, frische Zutaten und unverwechselbarer Geschmack. Bestell online zur Abholung oder Lieferung in Frankfurt.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Schnitzy Haus",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    siteName: "Schnitzy Haus",
    locale: "de_DE",
    title: "Schnitzy Haus — Premium Burgers & Bowls",
    description:
      "Frankfurts Home of Premium Burgers. Handgemacht, frisch zubereitet, schnell geliefert.",
  },
  formatDetection: { telephone: true, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Light-only brand: one theme colour, no dark variant.
  themeColor: "#fdf7f0",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${display.variable} ${script.variable} ${body.variable}`}
    >
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
