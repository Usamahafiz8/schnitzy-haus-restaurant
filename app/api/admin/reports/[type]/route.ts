import { badRequest, handler, requireStaff } from "@/lib/api";
import { salesSeries, toCsv, topCustomers, topItems } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { getRestaurantId } from "@/lib/restaurant";
import { toNumber } from "@/lib/utils";

type Params = { params: Promise<{ type: string }> };

const REPORTS = ["sales", "orders", "items", "customers", "bookings"] as const;
type ReportType = (typeof REPORTS)[number];

export const dynamic = "force-dynamic";

/**
 * CSV export for the reporting screen. PDF is deliberately left to the
 * browser's print-to-PDF on the printable report views — it keeps the server
 * free of a headless renderer and the output matches what staff see on screen.
 */
export const GET = handler(async (req: Request, { params }: Params) => {
  await requireStaff();
  const { type } = await params;

  if (!REPORTS.includes(type as ReportType)) {
    throw badRequest(`Unknown report. Choose one of: ${REPORTS.join(", ")}`);
  }

  const url = new URL(req.url);
  const restaurantId = await getRestaurantId();
  const to = url.searchParams.get("to")
    ? new Date(`${url.searchParams.get("to")}T23:59:59.999`)
    : new Date();
  const from = url.searchParams.get("from")
    ? new Date(`${url.searchParams.get("from")}T00:00:00`)
    : new Date(to.getTime() - 29 * 86400_000);

  let rows: Record<string, unknown>[] = [];
  let headers: string[] | undefined;

  switch (type as ReportType) {
    case "sales": {
      rows = await salesSeries(restaurantId, from, to, "day");
      headers = ["date", "orders", "revenue"];
      break;
    }
    case "items": {
      rows = await topItems(restaurantId, from, to, 500);
      headers = ["name", "quantity", "revenue"];
      break;
    }
    case "customers": {
      rows = await topCustomers(restaurantId, from, to, 500);
      headers = ["name", "email", "orders", "spent"];
      break;
    }
    case "orders": {
      const orders = await prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: from, lte: to } },
        orderBy: { createdAt: "asc" },
        select: {
          orderNumber: true,
          createdAt: true,
          customerName: true,
          customerEmail: true,
          orderType: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          subtotal: true,
          discountAmount: true,
          deliveryFee: true,
          tax: true,
          totalAmount: true,
          couponCode: true,
        },
      });
      rows = orders.map((o) => ({
        ...o,
        createdAt: o.createdAt.toISOString(),
        subtotal: toNumber(o.subtotal),
        discountAmount: toNumber(o.discountAmount),
        deliveryFee: toNumber(o.deliveryFee),
        tax: toNumber(o.tax),
        totalAmount: toNumber(o.totalAmount),
      }));
      break;
    }
    case "bookings": {
      const bookings = await prisma.tableBooking.findMany({
        where: { restaurantId, bookingDate: { gte: from, lte: to } },
        orderBy: { startsAt: "asc" },
        select: {
          bookingNumber: true,
          bookingDate: true,
          bookingTime: true,
          numberOfGuests: true,
          tableNumber: true,
          customerName: true,
          customerPhone: true,
          status: true,
          occasion: true,
        },
      });
      rows = bookings.map((b) => ({
        ...b,
        bookingDate: b.bookingDate.toISOString().slice(0, 10),
      }));
      break;
    }
  }

  const csv = toCsv(rows, headers);
  const filename = `schnitzy-${type}-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv`;

  return new Response(`﻿${csv}`, {
    headers: {
      // BOM above so Excel opens UTF-8 correctly.
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
