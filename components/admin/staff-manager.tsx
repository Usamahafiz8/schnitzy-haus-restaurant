"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Plus, Trash2, UserCog } from "lucide-react";
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
import { Input, Select } from "@/components/ui/input";
import { apiErrorMessage, apiFieldErrors, deleteJson, postJson, putJson } from "@/lib/api-client";
import { formatDate, initials } from "@/lib/utils";
import type { Role } from "@prisma/client";

type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: string;
};

const ROLES: Role[] = ["ADMIN", "STAFF", "KITCHEN", "DELIVERY"];

const ROLE_VARIANT: Record<string, "default" | "info" | "warning" | "neutral"> = {
  ADMIN: "default",
  STAFF: "info",
  KITCHEN: "warning",
  DELIVERY: "neutral",
};

export function StaffManager({
  staff,
  currentUserId,
}: {
  staff: Staff[];
  currentUserId: string;
}) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const tAuth = useTranslations("auth");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "STAFF" as Role,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const add = async () => {
    setSaving(true);
    setErrors({});
    try {
      await postJson("/admin/staff", form);
      // No password field: the server emails a set-password link instead.
      toast.success("Invitation sent", {
        description: `${form.email} can set their password from the emailed link.`,
      });
      setOpen(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", role: "STAFF" });
      router.refresh();
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (member: Staff, role: Role) => {
    try {
      await putJson(`/admin/staff/${member.id}`, { role });
      toast.success(tCommon("save"));
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const remove = async (member: Staff) => {
    try {
      await deleteJson(`/admin/staff/${member.id}`);
      toast.success(tCommon("delete"));
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden />
        {t("addStaff")}
      </Button>

      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {staff.map((member) => {
          const isSelf = member.id === currentUserId;

          return (
            <li key={member.id}>
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {initials(member.firstName, member.lastName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {member.firstName} {member.lastName}
                        {isSelf && (
                          <Badge variant="outline" className="ml-2">
                            You
                          </Badge>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email}
                      </p>
                      {member.phone && (
                        <p className="text-xs text-muted-foreground">{member.phone}</p>
                      )}
                    </div>
                    <Badge variant={ROLE_VARIANT[member.role] ?? "neutral"}>
                      {t(`roles.${member.role}`)}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Since {formatDate(member.createdAt)}
                  </p>

                  <div className="flex gap-2">
                    <Select
                      value={member.role}
                      disabled={isSelf}
                      onChange={(e) => changeRole(member, e.target.value as Role)}
                      aria-label={`${t("role")} for ${member.firstName}`}
                      className="flex-1"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {t(`roles.${role}`)}
                        </option>
                      ))}
                    </Select>

                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isSelf}
                      onClick={() => remove(member)}
                      aria-label={`${tCommon("delete")} ${member.firstName}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="size-4 text-primary" aria-hidden />
              {t("addStaff")}
            </DialogTitle>
          </DialogHeader>

          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <Field label={tAuth("firstName")} htmlFor="staffFirst" required error={errors.firstName}>
              <Input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
                autoFocus
              />
            </Field>

            <Field label={tAuth("lastName")} htmlFor="staffLast" required error={errors.lastName}>
              <Input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
              />
            </Field>

            <Field
              label={tCommon("email")}
              htmlFor="staffEmail"
              required
              error={errors.email}
              className="sm:col-span-2"
              hint="They'll get an email to set their own password"
            >
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Field>

            <Field label={tCommon("phone")} htmlFor="staffPhone" error={errors.phone}>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>

            <Field label={t("role")} htmlFor="staffRole" required>
              <Select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t(`roles.${role}`)}
                  </option>
                ))}
              </Select>
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
