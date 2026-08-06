"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Check, Loader2, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

import { BookingStatusBadge } from "@/components/shared/order-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/misc";
import { apiErrorMessage, deleteJson, getJson, postJson } from "@/lib/api-client";
import { cn, formatDate, toDateKey } from "@/lib/utils";
import type { TimeSlot } from "@/types";

type Booking = {
  id: string;
  bookingNumber: string;
  bookingDate: string;
  bookingTime: string;
  startsAt: string;
  numberOfGuests: number;
  tableNumber: string | null;
  status: "PENDING" | "CONFIRMED" | "SEATED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  specialRequests: string | null;
  occasion: string | null;
};

type Availability = {
  closed: boolean;
  slots: TimeSlot[];
  maxGuests: number;
};

const OCCASIONS = ["none", "birthday", "anniversary", "business", "celebration"] as const;

// Bookings open today and run four weeks out.
const MAX_DAYS_AHEAD = 28;

export function BookingManager({
  locale,
  maxGuests,
  bookings,
  defaults,
}: {
  locale: string;
  maxGuests: number;
  bookings: Booking[];
  defaults: { customerName: string; customerEmail: string; customerPhone: string };
}) {
  const t = useTranslations("bookings");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const today = toDateKey(new Date());
  const maxDate = toDateKey(new Date(Date.now() + MAX_DAYS_AHEAD * 86400_000));

  const [guests, setGuests] = useState(2);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string>("none");
  const [requests, setRequests] = useState("");
  const [contact, setContact] = useState(defaults);

  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadAvailability = useCallback(async () => {
    setLoadingSlots(true);
    setTime(null);
    try {
      const result = await getJson<Availability>("/bookings/availability", {
        date,
        guests,
      });
      setAvailability(result);
    } catch (error) {
      toast.error(apiErrorMessage(error));
      setAvailability(null);
    } finally {
      setLoadingSlots(false);
    }
  }, [date, guests]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const submit = async () => {
    if (!time) return;
    setSubmitting(true);
    try {
      await postJson("/bookings", {
        numberOfGuests: guests,
        bookingDate: date,
        bookingTime: time,
        customerName: contact.customerName,
        customerEmail: contact.customerEmail,
        customerPhone: contact.customerPhone,
        occasion: occasion === "none" ? undefined : occasion,
        specialRequests: requests || undefined,
      });

      toast.success(t("booked"));
      setRequests("");
      setTime(null);
      router.refresh();
      // The slot we just took is gone; refresh so nobody sees it as free.
      void loadAvailability();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (booking: Booking) => {
    try {
      await deleteJson(`/bookings/${booking.id}`);
      toast.success(t("status.CANCELLED"));
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const upcoming = bookings.filter(
    (b) => new Date(b.startsAt) >= new Date() && b.status !== "CANCELLED",
  );
  const past = bookings.filter(
    (b) => new Date(b.startsAt) < new Date() || b.status === "CANCELLED",
  );

  return (
    <Tabs defaultValue="new">
      <TabsList className="w-full">
        <TabsTrigger value="new" className="flex-1">
          {t("newBooking")}
        </TabsTrigger>
        <TabsTrigger value="mine" className="flex-1">
          {t("yourBookings")}
          {upcoming.length > 0 && ` (${upcoming.length})`}
        </TabsTrigger>
      </TabsList>

      {/* ----------------------------------------------------------- new booking */}
      <TabsContent value="new">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Card>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label={t("guests")} htmlFor="guests" required>
                <Select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                >
                  {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {t("guestCount", { count: n })}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label={t("chooseDate")} htmlFor="date" required>
                <Input
                  type="date"
                  value={date}
                  min={today}
                  max={maxDate}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("chooseTime")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSlots ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : availability?.closed ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t("closedOn")}
                </p>
              ) : availability && availability.slots.every((s) => !s.available) ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t("noSlots")}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {availability?.slots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setTime(slot.time)}
                      aria-pressed={time === slot.time}
                      className={cn(
                        "rounded-lg border py-2.5 text-sm font-medium tabular-nums transition-colors",
                        time === slot.time
                          ? "border-primary bg-primary text-primary-foreground"
                          : slot.available
                            ? "border-border hover:bg-muted"
                            : "cursor-not-allowed border-border/50 text-muted-foreground/40 line-through",
                      )}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {time && (
            <Card className="animate-slide-up">
              <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                <Field
                  label={tCommon("name")}
                  htmlFor="bookingName"
                  required
                  className="sm:col-span-2"
                >
                  <Input
                    value={contact.customerName}
                    onChange={(e) =>
                      setContact({ ...contact, customerName: e.target.value })
                    }
                    autoComplete="name"
                    required
                  />
                </Field>

                <Field label={tCommon("email")} htmlFor="bookingEmail" required>
                  <Input
                    type="email"
                    value={contact.customerEmail}
                    onChange={(e) =>
                      setContact({ ...contact, customerEmail: e.target.value })
                    }
                    autoComplete="email"
                    required
                  />
                </Field>

                <Field label={tCommon("phone")} htmlFor="bookingPhone" required>
                  <Input
                    type="tel"
                    value={contact.customerPhone}
                    onChange={(e) =>
                      setContact({ ...contact, customerPhone: e.target.value })
                    }
                    autoComplete="tel"
                    required
                  />
                </Field>

                <Field label={t("occasion")} htmlFor="occasion">
                  <Select
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                  >
                    {OCCASIONS.map((option) => (
                      <option key={option} value={option}>
                        {t(`occasions.${option}`)}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label={t("specialRequests")}
                  htmlFor="requests"
                  className="sm:col-span-2"
                >
                  <Textarea
                    rows={2}
                    value={requests}
                    onChange={(e) => setRequests(e.target.value)}
                    placeholder={t("specialRequestsPlaceholder")}
                    maxLength={500}
                  />
                </Field>
              </CardContent>
            </Card>
          )}

          <Button type="submit" size="lg" block disabled={!time} loading={submitting}>
            <Check aria-hidden />
            {time
              ? `${t("confirmBooking")} · ${formatDate(date, locale)} ${time}`
              : t("chooseTime")}
          </Button>
        </form>
      </TabsContent>

      {/* --------------------------------------------------------- my bookings */}
      <TabsContent value="mine">
        {bookings.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t("empty")} body={t("emptyBody")} />
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <ul className="space-y-3">
                {upcoming.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    locale={locale}
                    onCancel={() => cancel(booking)}
                    cancellable
                  />
                ))}
              </ul>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                  {tCommon("previous")}
                </h2>
                <ul className="space-y-3 opacity-70">
                  {past.map((booking) => (
                    <BookingRow key={booking.id} booking={booking} locale={locale} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function BookingRow({
  booking,
  locale,
  onCancel,
  cancellable,
}: {
  booking: Booking;
  locale: string;
  onCancel?: () => void;
  cancellable?: boolean;
}) {
  const t = useTranslations("bookings");

  // Matches the server-side cutoff so the button isn't offered when it'd fail.
  const canCancel =
    cancellable &&
    booking.status !== "CANCELLED" &&
    new Date(booking.startsAt).getTime() - Date.now() > 2 * 3600_000;

  return (
    <li>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">
                {formatDate(booking.bookingDate, locale)} · {booking.bookingTime}
              </p>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="size-3.5" aria-hidden />
                {t("guestCount", { count: booking.numberOfGuests })}
                {booking.tableNumber && ` · ${t("table")} ${booking.tableNumber}`}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {booking.bookingNumber}
              </p>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>

          {booking.specialRequests && (
            <p className="mt-2 text-sm italic text-muted-foreground">
              “{booking.specialRequests}”
            </p>
          )}

          {canCancel && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              className="mt-3 text-destructive"
            >
              <XCircle aria-hidden />
              {t("cancelBooking")}
            </Button>
          )}
        </CardContent>
      </Card>
    </li>
  );
}
