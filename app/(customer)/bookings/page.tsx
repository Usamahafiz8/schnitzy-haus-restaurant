import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { BookingManager } from "@/components/customer/booking-manager";
import { currentUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bookings");
  return { title: t("title"), description: t("subtitle") };
}

export default async function BookingsPage() {
  const locale = await getLocale();
  const t = await getTranslations("bookings");
  const restaurant = await getRestaurant();
  const user = await currentUser();

  if (!restaurant) return null;

  const [profile, bookings] = user
    ? await Promise.all([
        prisma.user.findUnique({
          where: { id: user.id },
          select: { firstName: true, lastName: true, email: true, phone: true },
        }),
        prisma.tableBooking.findMany({
          where: { customerId: user.id },
          orderBy: { startsAt: "desc" },
          take: 20,
        }),
      ])
    : [null, []];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </header>

      <BookingManager
        locale={locale}
        maxGuests={restaurant.bookingMaxGuests}
        bookings={serialize(bookings)}
        defaults={{
          customerName: profile ? `${profile.firstName} ${profile.lastName}`.trim() : "",
          customerEmail: profile?.email ?? "",
          customerPhone: profile?.phone ?? "",
        }}
      />
    </div>
  );
}
