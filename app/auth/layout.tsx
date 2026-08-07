import Link from "next/link";
import { ChefHat } from "lucide-react";

import { LocaleSwitcher } from "@/components/shared/locale-switcher";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-brand-50 to-background">
      <header className="flex items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <ChefHat className="size-6 text-primary" aria-hidden />
          Schnitzy Haus
        </Link>
        <LocaleSwitcher />
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
