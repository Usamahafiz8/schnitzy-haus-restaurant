"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LayoutGrid, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { apiErrorMessage, deleteJson, patchJson, postJson } from "@/lib/api-client";
import { cn, formatTime } from "@/lib/utils";
import type { TableStatus } from "@prisma/client";

type Table = {
  id: string;
  number: string;
  seats: number;
  location: string | null;
  status: TableStatus;
  isActive: boolean;
  bookings: {
    id: string;
    startsAt: string;
    numberOfGuests: number;
    customerName: string;
    status: string;
  }[];
};

const STATUS_STYLE: Record<TableStatus, string> = {
  FREE: "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30",
  OCCUPIED: "border-red-500/50 bg-red-50 dark:bg-red-950/30",
  RESERVED: "border-amber-500/50 bg-amber-50 dark:bg-amber-950/30",
  OUT_OF_SERVICE: "border-border bg-muted opacity-60",
};

const STATUSES: TableStatus[] = ["FREE", "OCCUPIED", "RESERVED", "OUT_OF_SERVICE"];

export function TablesManager({
  tables,
  locale,
}: {
  tables: Table[];
  locale: string;
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ number: "", seats: "4", location: "" });
  const [saving, setSaving] = useState(false);

  const setStatus = async (table: Table, status: TableStatus) => {
    try {
      await patchJson("/admin/tables", { id: table.id, status });
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const add = async () => {
    setSaving(true);
    try {
      await postJson("/admin/tables", {
        number: form.number,
        seats: Number(form.seats),
        location: form.location || undefined,
        isActive: true,
      });
      toast.success(tCommon("create"));
      setOpen(false);
      setForm({ number: "", seats: "4", location: "" });
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const retire = async (table: Table) => {
    try {
      await deleteJson(`/admin/tables/${table.id}`);
      toast.success(tCommon("delete"));
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const totalSeats = tables
    .filter((table) => table.isActive)
    .reduce((sum, table) => sum + table.seats, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setOpen(true)}>
          <Plus aria-hidden />
          {tCommon("create")}
        </Button>
        <p className="text-sm text-muted-foreground">
          {tables.filter((table) => table.isActive).length} tables · {totalSeats} seats
        </p>
      </div>

      {tables.length === 0 ? (
        <EmptyState icon={LayoutGrid} title={t("noData")} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((table) => (
            <li key={table.id}>
              <Card className={cn("border-2", STATUS_STYLE[table.status])}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-2xl font-bold">{table.number}</p>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="size-3.5" aria-hidden />
                        {table.seats}
                        {table.location && ` · ${table.location}`}
                      </p>
                    </div>
                    {!table.isActive && <Badge variant="neutral">Retired</Badge>}
                  </div>

                  {table.bookings.length > 0 && (
                    <ul className="space-y-1 border-t border-border/50 pt-2 text-xs">
                      {table.bookings.map((booking) => (
                        <li key={booking.id} className="flex justify-between gap-2">
                          <span className="truncate">{booking.customerName}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {formatTime(booking.startsAt, locale)} ·{" "}
                            {booking.numberOfGuests}p
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {table.isActive && (
                    <div className="flex flex-wrap gap-1">
                      {STATUSES.filter((status) => status !== "OUT_OF_SERVICE").map(
                        (status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={table.status === status ? "default" : "outline"}
                            onClick={() => setStatus(table, status)}
                            className="flex-1 px-2 text-xs"
                          >
                            {status === "FREE"
                              ? "Free"
                              : status === "OCCUPIED"
                                ? "Busy"
                                : "Held"}
                          </Button>
                        ),
                      )}
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => retire(table)}
                        aria-label={`${tCommon("delete")} ${table.number}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tables")}</DialogTitle>
          </DialogHeader>

          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <Field label="Number" htmlFor="tableNumber" required>
              <Input
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                required
                autoFocus
                maxLength={10}
              />
            </Field>

            <Field label="Seats" htmlFor="tableSeats" required>
              <Input
                type="number"
                min={1}
                max={30}
                value={form.seats}
                onChange={(e) => setForm({ ...form, seats: e.target.value })}
                required
              />
            </Field>

            <Field label="Location" htmlFor="tableLocation" className="sm:col-span-2">
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Window, Terrace, Back room…"
              />
            </Field>

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" loading={saving}>
                {tCommon("create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
