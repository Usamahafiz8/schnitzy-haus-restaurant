import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { BookingsBoard } from "@/components/admin/bookings-board";
import { prisma } from "@/lib/db";
import { requireRestaurant } from "@/lib/restaurant";
import { serialize } from "@/lib/serialize";
import { parseDateKey, toDateKey } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bookings", robots: { index: false } };

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const restaurant = await requireRestaurant();

  const date = params.date ?? toDateKey(new Date());

  const [bookings, tables] = await Promise.all([
    prisma.tableBooking.findMany({
      where: { restaurantId: restaurant.id, bookingDate: parseDateKey(date) },
      orderBy: [{ bookingTime: "asc" }],
      include: { table: { select: { id: true, number: true, seats: true } } },
    }),
    prisma.restaurantTable.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      orderBy: { number: "asc" },
      select: { id: true, number: true, seats: true, location: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("bookings")}</h1>

      <BookingsBoard
        date={date}
        bookings={serialize(bookings)}
        tables={tables}
        locale={locale}
      />
    </div>
  );
}
