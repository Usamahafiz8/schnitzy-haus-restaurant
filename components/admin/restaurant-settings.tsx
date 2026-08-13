"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/misc";
import { apiErrorMessage, putJson } from "@/lib/api-client";
import { WEEKDAYS, type OpeningHours } from "@/lib/utils";

type Restaurant = {
  name: string;
  description: string | null;
  email: string;
  phone: string;
  whatsappNumber: string | null;
  address: string;
  city: string;
  postalCode: string;
  cuisineType: string;
  openingHours: unknown;
  currency: string;
  taxRate: number;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  dineInEnabled: boolean;
  deliveryFee: number;
  freeDeliveryOver: number | null;
  deliveryRadiusKm: number;
  minOrderAmount: number;
  pointsPerCurrency: number;
  pointsPerDiscountUnit: number;
  bookingSlotMinutes: number;
  bookingMaxGuests: number;
  bookingLeadHours: number;
  bookingDurationMins: number;
  isActive: boolean;
};

type Integrations = Record<string, boolean>;

/** Plain label/value row for the read-only sections below. */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

export function RestaurantSettings({
  restaurant,
  integrations,
}: {
  restaurant: Restaurant;
  integrations: Integrations;
}) {
  const t = useTranslations("admin");
  const tLocation = useTranslations("location");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [isActive, setIsActive] = useState(restaurant.isActive);
  const [saving, setSaving] = useState(false);

  const hours = (restaurant.openingHours ?? {}) as OpeningHours;

  const toggleActive = async (checked: boolean) => {
    setIsActive(checked);
    setSaving(true);
    try {
      await putJson("/restaurant", { isActive: checked });
      toast.success(checked ? "Now accepting orders" : "Ordering paused");
      router.refresh();
    } catch (error) {
      setIsActive(!checked);
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* The one thing here that's still live — everything else below ships
          with the code. */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-medium">Accepting orders</p>
            <p className="text-sm text-muted-foreground">
              Pause instantly for a kitchen issue or an unexpected closure — no deploy needed.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isActive && <Badge variant="danger">Ordering paused</Badge>}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isActive}
                disabled={saving}
                onCheckedChange={(checked) => toggleActive(checked === true)}
              />
              {isActive ? "Open" : "Closed"}
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm text-muted-foreground">
            Everything below is hardcoded in{" "}
            <code className="rounded bg-muted px-1">lib/restaurant-config.ts</code> — edit
            that file and redeploy to change it.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile">
            <TabsList className="flex-wrap">
              <TabsTrigger value="profile">{t("restaurantProfile")}</TabsTrigger>
              <TabsTrigger value="hours">{t("openingHours")}</TabsTrigger>
              <TabsTrigger value="delivery">{t("deliverySettings")}</TabsTrigger>
              <TabsTrigger value="loyalty">{t("loyaltySettings")}</TabsTrigger>
              <TabsTrigger value="bookings">{t("bookingSettings")}</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>

            {/* --------------------------------------------------------- profile */}
            <TabsContent value="profile">
              <dl className="grid gap-4 pt-4 sm:grid-cols-2">
                <Row label={tCommon("name")} value={restaurant.name} />
                <Row label="Cuisine" value={restaurant.cuisineType} />
                {restaurant.description && (
                  <div className="sm:col-span-2">
                    <Row label="Description" value={restaurant.description} />
                  </div>
                )}
                <Row label={tCommon("email")} value={restaurant.email} />
                <Row label={tCommon("phone")} value={restaurant.phone} />
                {restaurant.whatsappNumber && (
                  <Row label="WhatsApp" value={restaurant.whatsappNumber} />
                )}
                <div className="sm:col-span-2">
                  <Row
                    label={tLocation("address")}
                    value={`${restaurant.address}, ${restaurant.postalCode} ${restaurant.city}`}
                  />
                </div>
              </dl>
            </TabsContent>

            {/* ----------------------------------------------------------- hours */}
            <TabsContent value="hours">
              <div className="space-y-2 pt-4">
                {WEEKDAYS.map((day) => {
                  const entry = hours[day];
                  const closed = entry?.closed ?? true;
                  return (
                    <div
                      key={day}
                      className="flex items-center gap-3 border-b border-border pb-2 text-sm last:border-0"
                    >
                      <span className="w-28 font-medium capitalize">
                        {tLocation(`days.${day}`)}
                      </span>
                      {closed ? (
                        <Badge variant="neutral">{tCommon("closed")}</Badge>
                      ) : (
                        <span>
                          {entry?.open} – {entry?.close}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* -------------------------------------------------------- delivery */}
            <TabsContent value="delivery">
              <dl className="grid gap-4 pt-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Order types</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {restaurant.pickupEnabled && <Badge variant="success">Pickup</Badge>}
                    {restaurant.deliveryEnabled && <Badge variant="success">Delivery</Badge>}
                    {restaurant.dineInEnabled && <Badge variant="success">Dine in</Badge>}
                  </dd>
                </div>
                <Row label="Delivery fee" value={`${restaurant.deliveryFee} ${restaurant.currency}`} />
                <Row
                  label="Free delivery over"
                  value={
                    restaurant.freeDeliveryOver !== null
                      ? `${restaurant.freeDeliveryOver} ${restaurant.currency}`
                      : "Always charged"
                  }
                />
                <Row
                  label="Minimum order"
                  value={`${restaurant.minOrderAmount} ${restaurant.currency}`}
                />
                <Row label="Delivery radius" value={`${restaurant.deliveryRadiusKm} km`} />
                <Row label="VAT rate" value={`${restaurant.taxRate}% (included in menu prices)`} />
              </dl>
            </TabsContent>

            {/* --------------------------------------------------------- loyalty */}
            <TabsContent value="loyalty">
              <dl className="grid gap-4 pt-4 sm:grid-cols-2">
                <Row
                  label="Points per currency unit"
                  value={`${restaurant.pointsPerCurrency} (1 = one point per ${restaurant.currency}1 spent)`}
                />
                <Row
                  label={`Points per ${restaurant.currency}1 discount`}
                  value={restaurant.pointsPerDiscountUnit}
                />
              </dl>
            </TabsContent>

            {/* -------------------------------------------------------- bookings */}
            <TabsContent value="bookings">
              <dl className="grid gap-4 pt-4 sm:grid-cols-2">
                <Row label="Slot length" value={`${restaurant.bookingSlotMinutes} min`} />
                <Row label="Sitting length" value={`${restaurant.bookingDurationMins} min`} />
                <Row label="Max guests online" value={restaurant.bookingMaxGuests} />
                <Row label="Lead time" value={`${restaurant.bookingLeadHours} h`} />
              </dl>
            </TabsContent>

            {/* ---------------------------------------------------- integrations */}
            <TabsContent value="integrations">
              <div className="pt-4">
                <p className="mb-3 text-sm text-muted-foreground">
                  Configured through environment variables — see{" "}
                  <code className="rounded bg-muted px-1">.env.example</code>.
                </p>
                <ul className="divide-y divide-border">
                  {(
                    [
                      ["stripe", "Stripe payments", "STRIPE_SECRET_KEY"],
                      ["maps", "Google Maps", "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"],
                      ["email", "Email (SMTP)", "SMTP_HOST / SMTP_USER"],
                      ["whatsapp", "WhatsApp (Twilio)", "TWILIO_ACCOUNT_SID"],
                      ["push", "Push notifications (FCM)", "FIREBASE_SERVICE_ACCOUNT_JSON"],
                      ["storage", "Image uploads (S3)", "S3_BUCKET"],
                      ["redis", "Cache & rate limiting", "REDIS_URL"],
                    ] as const
                  ).map(([key, label, envVar]) => (
                    <li key={key} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <code className="text-xs text-muted-foreground">{envVar}</code>
                      </div>
                      {integrations[key] ? (
                        <Badge variant="success">
                          <CheckCircle2 aria-hidden />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="neutral">
                          <XCircle aria-hidden />
                          Not configured
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
