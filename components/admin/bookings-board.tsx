"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CalendarDays, Check, Phone, UserX, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

import { BookingStatusBadge } from "@/components/shared/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { apiErrorMessage, deleteJson, putJson } from "@/lib/api-client";
import { formatDate, toDateKey } from "@/lib/utils";
import type { BookingStatus } from "@/types";

type Booking = {
  id: string;
  bookingNumber: string;
  bookingTime: string;
  numberOfGuests: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  specialRequests: string | null;
  occasion: string | null;
  status: BookingStatus;
  tableId: string | null;
  tableNumber: string | null;
};

type Table = { id: string; number: string; seats: number; location: string | null };

export function BookingsBoard({
  date,
  bookings,
  tables,
  locale,
}: {
  date: string;
  bookings: Booking[];
  tables: Table[];
  locale: string;
}) {
  const t = useTranslations("admin");
  const tBookings = useTranslations("bookings");
  const router = useRouter();
  const params = useSearchParams();

  const [pending, setPending] = useState<string | null>(null);

  const setDate = (next: string) => {
    const query = new URLSearchParams(params.toString());
    query.set("date", next);
    router.push(`/admin/bookings?${query.toString()}`);
  };

  const update = async (id: string, body: Record<string, unknown>) => {
    setPending(id);
    try {
      await putJson(`/bookings/${id}`, body);
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const cancel = async (id: string) => {
    setPending(id);
    try {
      await deleteJson(`/bookings/${id}?reason=Cancelled by restaurant`);
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const active = bookings.filter((b) => b.status !== "CANCELLED");
  const totalGuests = active.reduce((sum, b) => sum + b.numberOfGuests, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium">{tBookings("chooseDate")}</span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
        </label>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDate(toDateKey(new Date()))}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDate(toDateKey(new Date(Date.now() + 86400_000)))}
          >
            Tomorrow
          </Button>
        </div>

        <p className="ml-auto text-sm text-muted-foreground">
          {formatDate(date, locale)} · {active.length} bookings ·{" "}
          {tBookings("guestCount", { count: totalGuests })}
        </p>
      </div>

      {bookings.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t("noData")} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {bookings.map((booking) => (
            <li key={booking.id}>
              <Card className={booking.status === "CANCELLED" ? "opacity-60" : ""}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-lg font-bold tabular-nums">
                        {booking.bookingTime}
                      </p>
                      <p className="truncate font-medium">{booking.customerName}</p>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="size-3" aria-hidden />
                        {tBookings("guestCount", { count: booking.numberOfGuests })}
                      </p>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </div>

                  <a
                    href={`tel:${booking.customerPhone.replace(/\s/g, "")}`}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="size-3.5" aria-hidden />
                    {booking.customerPhone}
                  </a>

                  {booking.occasion && (
                    <p className="text-sm">
                      🎉 {tBookings(`occasions.${booking.occasion}` as "occasions.birthday")}
                    </p>
                  )}

                  {booking.specialRequests && (
                    <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      {booking.specialRequests}
                    </p>
                  )}

                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t("assignTable")}
                    </span>
                    <Select
                      value={booking.tableId ?? ""}
                      disabled={pending === booking.id || booking.status === "CANCELLED"}
                      onChange={(e) =>
                        update(booking.id, { tableId: e.target.value || null })
                      }
                    >
                      <option value="">—</option>
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          {table.number} ({table.seats})
                          {table.location ? ` · ${table.location}` : ""}
                        </option>
                      ))}
                    </Select>
                  </label>

                  {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
                    <div className="flex flex-wrap gap-2">
                      {booking.status !== "SEATED" && (
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={pending === booking.id}
                          onClick={() => update(booking.id, { status: "SEATED" })}
                        >
                          <Check aria-hidden />
                          {t("markSeated")}
                        </Button>
                      )}

                      {booking.status === "SEATED" && (
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={pending === booking.id}
                          onClick={() => update(booking.id, { status: "COMPLETED" })}
                        >
                          <Check aria-hidden />
                          {t("markCompleted")}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending === booking.id}
                        onClick={() => update(booking.id, { status: "NO_SHOW" })}
                        aria-label={t("markNoShow")}
                      >
                        <UserX aria-hidden />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        disabled={pending === booking.id}
                        onClick={() => cancel(booking.id)}
                        aria-label={tBookings("cancelBooking")}
                      >
                        <XCircle aria-hidden />
                      </Button>
                    </div>
                  )}

                  <p className="font-mono text-[10px] text-muted-foreground">
                    {booking.bookingNumber}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
