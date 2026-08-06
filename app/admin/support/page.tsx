import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { SupportInbox } from "@/components/admin/support-inbox";
import { prisma } from "@/lib/db";
import { requireRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Support", robots: { index: false } };

export default async function AdminSupportPage() {
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const restaurant = await requireRestaurant();

  const inquiries = await prisma.inquiry.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("support")}</h1>
      <SupportInbox
        inquiries={serialize(inquiries)}
        locale={locale}
        whatsappConfigured={Boolean(restaurant.whatsappNumber)}
      />
    </div>
  );
}
