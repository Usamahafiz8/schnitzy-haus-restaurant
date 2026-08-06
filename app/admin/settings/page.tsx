import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { RestaurantSettings } from "@/components/admin/restaurant-settings";
import { requireRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function AdminSettingsPage() {
  const t = await getTranslations("admin");
  const restaurant = await requireRestaurant();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("settings")}</h1>

      <RestaurantSettings
        restaurant={serialize(restaurant)}
        integrations={{
          stripe: Boolean(process.env.STRIPE_SECRET_KEY),
          maps: Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
          email: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
          whatsapp: Boolean(process.env.TWILIO_ACCOUNT_SID),
          push: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
          storage: Boolean(process.env.S3_BUCKET),
          redis: Boolean(process.env.REDIS_URL),
        }}
      />
    </div>
  );
}
