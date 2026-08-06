"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-field";
import { Input, Textarea } from "@/components/ui/input";
import { Checkbox, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/misc";
import { apiErrorMessage, apiFieldErrors, putJson } from "@/lib/api-client";
import { WEEKDAYS, type OpeningHours } from "@/lib/utils";

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  email: string;
  phone: string;
  whatsappNumber: string | null;
  address: string;
  city: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  cuisineType: string;
  openingHours: unknown;
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

export function RestaurantSettings({
  restaurant,
  integrations,
}: {
  restaurant: Restaurant;
  integrations: Integrations;
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const tLocation = useTranslations("location");
  const router = useRouter();

  const [profile, setProfile] = useState({
    name: restaurant.name,
    description: restaurant.description ?? "",
    email: restaurant.email,
    phone: restaurant.phone,
    whatsappNumber: restaurant.whatsappNumber ?? "",
    address: restaurant.address,
    city: restaurant.city,
    postalCode: restaurant.postalCode,
    cuisineType: restaurant.cuisineType,
    isActive: restaurant.isActive,
  });

  const [hours, setHours] = useState<OpeningHours>(
    (restaurant.openingHours ?? {}) as OpeningHours,
  );

  const [delivery, setDelivery] = useState({
    deliveryEnabled: restaurant.deliveryEnabled,
    pickupEnabled: restaurant.pickupEnabled,
    dineInEnabled: restaurant.dineInEnabled,
    deliveryFee: String(restaurant.deliveryFee),
    freeDeliveryOver:
      restaurant.freeDeliveryOver === null ? "" : String(restaurant.freeDeliveryOver),
    deliveryRadiusKm: String(restaurant.deliveryRadiusKm),
    minOrderAmount: String(restaurant.minOrderAmount),
    taxRate: String(restaurant.taxRate),
  });

  const [loyalty, setLoyalty] = useState({
    pointsPerCurrency: String(restaurant.pointsPerCurrency),
    pointsPerDiscountUnit: String(restaurant.pointsPerDiscountUnit),
  });

  const [booking, setBooking] = useState({
    bookingSlotMinutes: String(restaurant.bookingSlotMinutes),
    bookingMaxGuests: String(restaurant.bookingMaxGuests),
    bookingLeadHours: String(restaurant.bookingLeadHours),
    bookingDurationMins: String(restaurant.bookingDurationMins),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (section: string, payload: Record<string, unknown>) => {
    setSaving(section);
    setErrors({});
    try {
      await putJson("/restaurant", payload);
      toast.success(tCommon("save"));
      router.refresh();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(null);
    }
  };

  const setDay = (
    day: string,
    patch: Partial<{ open: string; close: string; closed: boolean }>,
  ) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        open: prev[day as keyof OpeningHours]?.open ?? "11:00",
        close: prev[day as keyof OpeningHours]?.close ?? "22:00",
        closed: prev[day as keyof OpeningHours]?.closed ?? false,
        ...patch,
      },
    }));
  };

  return (
    <Tabs defaultValue="profile">
      <TabsList className="flex-wrap">
        <TabsTrigger value="profile">{t("restaurantProfile")}</TabsTrigger>
        <TabsTrigger value="hours">{t("openingHours")}</TabsTrigger>
        <TabsTrigger value="delivery">{t("deliverySettings")}</TabsTrigger>
        <TabsTrigger value="loyalty">{t("loyaltySettings")}</TabsTrigger>
        <TabsTrigger value="bookings">{t("bookingSettings")}</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
      </TabsList>

      {/* ------------------------------------------------------------- profile */}
      <TabsContent value="profile">
        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label={tCommon("name")} htmlFor="name" required error={errors.name}>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </Field>

            <Field label="Cuisine" htmlFor="cuisineType">
              <Input
                value={profile.cuisineType}
                onChange={(e) => setProfile({ ...profile, cuisineType: e.target.value })}
              />
            </Field>

            <Field label="Description" htmlFor="description" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              />
            </Field>

            <Field label={tCommon("email")} htmlFor="email" error={errors.email}>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </Field>

            <Field label={tCommon("phone")} htmlFor="phone" error={errors.phone}>
              <Input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </Field>

            <Field
              label="WhatsApp number"
              htmlFor="whatsappNumber"
              hint="E.164 format, e.g. +49 30 12345678"
            >
              <Input
                type="tel"
                value={profile.whatsappNumber}
                onChange={(e) =>
                  setProfile({ ...profile, whatsappNumber: e.target.value })
                }
              />
            </Field>

            <Field label={tLocation("address")} htmlFor="address" className="sm:col-span-2">
              <Input
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              />
            </Field>

            <Field label="Postal code" htmlFor="postalCode">
              <Input
                value={profile.postalCode}
                onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
              />
            </Field>

            <Field label="City" htmlFor="city">
              <Input
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
              />
            </Field>

            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={profile.isActive}
                onCheckedChange={(checked) =>
                  setProfile({ ...profile, isActive: checked === true })
                }
              />
              Accepting orders
              {!profile.isActive && (
                <Badge variant="danger" className="ml-2">
                  Ordering paused
                </Badge>
              )}
            </label>

            <div className="sm:col-span-2">
              <Button
                loading={saving === "profile"}
                onClick={() =>
                  save("profile", {
                    ...profile,
                    whatsappNumber: profile.whatsappNumber || "",
                  })
                }
              >
                {tCommon("save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* --------------------------------------------------------------- hours */}
      <TabsContent value="hours">
        <Card>
          <CardContent className="space-y-3 p-5">
            {WEEKDAYS.map((day) => {
              const entry = hours[day];
              const closed = entry?.closed ?? true;

              return (
                <div
                  key={day}
                  className="flex flex-wrap items-center gap-3 border-b border-border pb-3 last:border-0"
                >
                  <span className="w-28 text-sm font-medium capitalize">
                    {tLocation(`days.${day}`)}
                  </span>

                  <Switch
                    checked={!closed}
                    onCheckedChange={(checked) => setDay(day, { closed: !checked })}
                    aria-label={`${day} open`}
                  />

                  <Input
                    type="time"
                    value={entry?.open ?? "11:00"}
                    disabled={closed}
                    onChange={(e) => setDay(day, { open: e.target.value })}
                    className="w-32"
                    aria-label={`${day} opening time`}
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="time"
                    value={entry?.close ?? "22:00"}
                    disabled={closed}
                    onChange={(e) => setDay(day, { close: e.target.value })}
                    className="w-32"
                    aria-label={`${day} closing time`}
                  />

                  {closed && <Badge variant="neutral">{tCommon("closed")}</Badge>}
                </div>
              );
            })}

            <Button
              loading={saving === "hours"}
              onClick={() => save("hours", { openingHours: hours })}
            >
              {tCommon("save")}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ------------------------------------------------------------ delivery */}
      <TabsContent value="delivery">
        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm font-medium">Order types</legend>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    ["pickupEnabled", "Pickup"],
                    ["deliveryEnabled", "Delivery"],
                    ["dineInEnabled", "Dine in"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={delivery[key]}
                      onCheckedChange={(checked) =>
                        setDelivery({ ...delivery, [key]: checked === true })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <Field label="Delivery fee" htmlFor="deliveryFee">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={delivery.deliveryFee}
                onChange={(e) =>
                  setDelivery({ ...delivery, deliveryFee: e.target.value })
                }
              />
            </Field>

            <Field
              label="Free delivery over"
              htmlFor="freeDeliveryOver"
              hint="Blank to always charge"
            >
              <Input
                type="number"
                step="0.01"
                min="0"
                value={delivery.freeDeliveryOver}
                onChange={(e) =>
                  setDelivery({ ...delivery, freeDeliveryOver: e.target.value })
                }
              />
            </Field>

            <Field label="Minimum order" htmlFor="minOrderAmount">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={delivery.minOrderAmount}
                onChange={(e) =>
                  setDelivery({ ...delivery, minOrderAmount: e.target.value })
                }
              />
            </Field>

            <Field label="Delivery radius (km)" htmlFor="deliveryRadiusKm">
              <Input
                type="number"
                step="0.5"
                min="0"
                value={delivery.deliveryRadiusKm}
                onChange={(e) =>
                  setDelivery({ ...delivery, deliveryRadiusKm: e.target.value })
                }
              />
            </Field>

            <Field
              label="VAT rate (%)"
              htmlFor="taxRate"
              hint="Included in menu prices"
            >
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={delivery.taxRate}
                onChange={(e) => setDelivery({ ...delivery, taxRate: e.target.value })}
              />
            </Field>

            <div className="sm:col-span-2">
              <Button
                loading={saving === "delivery"}
                onClick={() =>
                  save("delivery", {
                    deliveryEnabled: delivery.deliveryEnabled,
                    pickupEnabled: delivery.pickupEnabled,
                    dineInEnabled: delivery.dineInEnabled,
                    deliveryFee: Number(delivery.deliveryFee),
                    freeDeliveryOver: delivery.freeDeliveryOver
                      ? Number(delivery.freeDeliveryOver)
                      : null,
                    deliveryRadiusKm: Number(delivery.deliveryRadiusKm),
                    minOrderAmount: Number(delivery.minOrderAmount),
                    taxRate: Number(delivery.taxRate),
                  })
                }
              >
                {tCommon("save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ------------------------------------------------------------- loyalty */}
      <TabsContent value="loyalty">
        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <Field
              label="Points per currency unit"
              htmlFor="pointsPerCurrency"
              hint="1 = one point per €1 spent"
            >
              <Input
                type="number"
                step="0.1"
                min="0"
                value={loyalty.pointsPerCurrency}
                onChange={(e) =>
                  setLoyalty({ ...loyalty, pointsPerCurrency: e.target.value })
                }
              />
            </Field>

            <Field
              label="Points per €1 discount"
              htmlFor="pointsPerDiscountUnit"
              hint="100 = 100 points buys €1 off"
            >
              <Input
                type="number"
                step="1"
                min="1"
                value={loyalty.pointsPerDiscountUnit}
                onChange={(e) =>
                  setLoyalty({ ...loyalty, pointsPerDiscountUnit: e.target.value })
                }
              />
            </Field>

            <div className="sm:col-span-2">
              <Button
                loading={saving === "loyalty"}
                onClick={() =>
                  save("loyalty", {
                    pointsPerCurrency: Number(loyalty.pointsPerCurrency),
                    pointsPerDiscountUnit: Number(loyalty.pointsPerDiscountUnit),
                  })
                }
              >
                {tCommon("save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ------------------------------------------------------------ bookings */}
      <TabsContent value="bookings">
        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Slot length (min)" htmlFor="bookingSlotMinutes">
              <Input
                type="number"
                min={5}
                max={120}
                step={5}
                value={booking.bookingSlotMinutes}
                onChange={(e) =>
                  setBooking({ ...booking, bookingSlotMinutes: e.target.value })
                }
              />
            </Field>

            <Field
              label="Sitting length (min)"
              htmlFor="bookingDurationMins"
              hint="How long a table is held"
            >
              <Input
                type="number"
                min={15}
                max={360}
                step={15}
                value={booking.bookingDurationMins}
                onChange={(e) =>
                  setBooking({ ...booking, bookingDurationMins: e.target.value })
                }
              />
            </Field>

            <Field label="Max guests online" htmlFor="bookingMaxGuests">
              <Input
                type="number"
                min={1}
                max={100}
                value={booking.bookingMaxGuests}
                onChange={(e) =>
                  setBooking({ ...booking, bookingMaxGuests: e.target.value })
                }
              />
            </Field>

            <Field
              label="Lead time (hours)"
              htmlFor="bookingLeadHours"
              hint="Minimum notice before a slot"
            >
              <Input
                type="number"
                min={0}
                max={72}
                value={booking.bookingLeadHours}
                onChange={(e) =>
                  setBooking({ ...booking, bookingLeadHours: e.target.value })
                }
              />
            </Field>

            <div className="sm:col-span-2">
              <Button
                loading={saving === "bookings"}
                onClick={() =>
                  save("bookings", {
                    bookingSlotMinutes: Number(booking.bookingSlotMinutes),
                    bookingMaxGuests: Number(booking.bookingMaxGuests),
                    bookingLeadHours: Number(booking.bookingLeadHours),
                    bookingDurationMins: Number(booking.bookingDurationMins),
                  })
                }
              >
                {tCommon("save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* -------------------------------------------------------- integrations */}
      <TabsContent value="integrations">
        <Card>
          <CardHeader>
            <CardTitle>Connected services</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configured through environment variables — see{" "}
              <code className="rounded bg-muted px-1">.env.example</code>.
            </p>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
