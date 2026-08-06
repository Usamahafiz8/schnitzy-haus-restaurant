"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Bell, Heart, LogOut, MapPin, Plus, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import { DishImage } from "@/components/shared/dish-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Separator, Switch } from "@/components/ui/misc";
import {
  apiErrorMessage,
  apiFieldErrors,
  deleteJson,
  patchJson,
  postJson,
  putJson,
} from "@/lib/api-client";
import {
  isFirebaseConfigured,
  pushPermission,
  requestPushToken,
} from "@/lib/firebase-client";
import { formatCurrency } from "@/lib/utils";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  locale: string;
  notifyEmail: boolean;
  notifyPush: boolean;
  notifySms: boolean;
  notifyWhatsapp: boolean;
  notifyMarketing: boolean;
};

type Address = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  isDefault: boolean;
};

type Favorite = {
  id: string;
  menuItem: {
    id: string;
    name: string;
    nameDe: string | null;
    price: number;
    image: string | null;
  };
};

export function ProfileSettings({
  user,
  addresses,
  favorites,
}: {
  user: User;
  addresses: Address[];
  favorites: Favorite[];
}) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const locale = useLocale();
  const { update } = useSession();

  const [details, setDetails] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? "",
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const [prefs, setPrefs] = useState({
    notifyEmail: user.notifyEmail,
    notifyPush: user.notifyPush,
    notifySms: user.notifySms,
    notifyWhatsapp: user.notifyWhatsapp,
    notifyMarketing: user.notifyMarketing,
  });

  const [newAddress, setNewAddress] = useState({
    label: "Home",
    line1: "",
    city: "",
    postalCode: "",
  });
  const [addingAddress, setAddingAddress] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const saveDetails = async () => {
    setSavingDetails(true);
    setDetailErrors({});
    try {
      await putJson("/auth/me", details);
      // Refresh the JWT so the header greets them by the new name immediately.
      await update();
      toast.success(t("saved"));
      router.refresh();
    } catch (error) {
      setDetailErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSavingDetails(false);
    }
  };

  const savePassword = async () => {
    setSavingPassword(true);
    setPasswordErrors({});
    try {
      await patchJson("/auth/me", passwords);
      toast.success(t("passwordChanged"));
      setPasswords({ currentPassword: "", password: "", confirmPassword: "" });
    } catch (error) {
      setPasswordErrors(apiFieldErrors(error));
      toast.error(apiErrorMessage(error));
    } finally {
      setSavingPassword(false);
    }
  };

  const savePrefs = async (next: typeof prefs) => {
    setPrefs(next);
    try {
      await putJson("/auth/me", next);
      toast.success(t("saved"));
    } catch (error) {
      setPrefs(prefs);
      toast.error(apiErrorMessage(error));
    }
  };

  const enablePush = async () => {
    const token = await requestPushToken();
    if (!token) {
      toast.error(
        pushPermission() === "denied" ? t("pushBlocked") : "Push isn't available here",
      );
      return;
    }
    try {
      await postJson("/notifications/subscribe", {
        token,
        platform: "web",
        userAgent: navigator.userAgent.slice(0, 300),
      });
      setPrefs((p) => ({ ...p, notifyPush: true }));
      toast.success(t("pushEnabled"));
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const addAddress = async () => {
    setAddingAddress(true);
    try {
      await postJson("/addresses", { ...newAddress, country: "DE" });
      setNewAddress({ label: "Home", line1: "", city: "", postalCode: "" });
      setShowAddressForm(false);
      toast.success(t("saved"));
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setAddingAddress(false);
    }
  };

  const removeAddress = async (id: string) => {
    try {
      await deleteJson(`/addresses/${id}`);
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const removeFavorite = async (menuItemId: string) => {
    try {
      await postJson("/favorites", { menuItemId });
      router.refresh();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const pushSupported = isFirebaseConfigured();

  return (
    <div className="space-y-5">
      {/* --------------------------------------------------------- personal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-4 text-primary" aria-hidden />
            {t("personalDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void saveDetails();
            }}
          >
            <Field
              label={t("firstName")}
              htmlFor="firstName"
              error={detailErrors.firstName}
            >
              <Input
                value={details.firstName}
                onChange={(e) => setDetails({ ...details, firstName: e.target.value })}
                autoComplete="given-name"
              />
            </Field>

            <Field label={t("lastName")} htmlFor="lastName" error={detailErrors.lastName}>
              <Input
                value={details.lastName}
                onChange={(e) => setDetails({ ...details, lastName: e.target.value })}
                autoComplete="family-name"
              />
            </Field>

            <Field label={tCommon("email")} htmlFor="email">
              <Input value={user.email} disabled readOnly />
            </Field>

            <Field label={tCommon("phone")} htmlFor="phone" error={detailErrors.phone}>
              <Input
                type="tel"
                value={details.phone}
                onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                autoComplete="tel"
              />
            </Field>

            <div className="sm:col-span-2">
              <Button type="submit" loading={savingDetails}>
                {savingDetails ? tCommon("saving") : tCommon("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------- notifications */}
      <Card id="notifications">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4 text-primary" aria-hidden />
            {t("notifications")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(
            [
              ["notifyEmail", t("notifyEmail")],
              ["notifyPush", t("notifyPush")],
              ["notifyWhatsapp", t("notifyWhatsapp")],
              ["notifySms", t("notifySms")],
              ["notifyMarketing", t("notifyMarketing")],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between gap-4 py-2.5 text-sm"
            >
              {label}
              <Switch
                checked={prefs[key]}
                onCheckedChange={(checked) => savePrefs({ ...prefs, [key]: checked })}
                aria-label={label}
              />
            </label>
          ))}

          {pushSupported && pushPermission() !== "granted" && (
            <>
              <Separator className="my-3" />
              <Button variant="outline" size="sm" onClick={enablePush}>
                <Bell aria-hidden />
                {t("enablePush")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* --------------------------------------------------------- addresses */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" aria-hidden />
            {t("addresses")}
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAddressForm((v) => !v)}
          >
            <Plus aria-hidden />
            {t("addAddress")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  {address.label}
                  {address.isDefault && (
                    <Badge variant="neutral">{t("defaultAddress")}</Badge>
                  )}
                </p>
                <p className="text-muted-foreground">
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}, {address.postalCode}{" "}
                  {address.city}
                </p>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => removeAddress(address.id)}
                aria-label={`${tCommon("delete")} ${address.label}`}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </div>
          ))}

          {showAddressForm && (
            <form
              className="animate-in grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void addAddress();
              }}
            >
              <Field label={tCommon("name")} htmlFor="addrLabel">
                <Input
                  value={newAddress.label}
                  onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                />
              </Field>
              <Field label="Street" htmlFor="addrLine1" required>
                <Input
                  value={newAddress.line1}
                  onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                  autoComplete="address-line1"
                  required
                />
              </Field>
              <Field label="Postal code" htmlFor="addrPostal" required>
                <Input
                  value={newAddress.postalCode}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, postalCode: e.target.value })
                  }
                  autoComplete="postal-code"
                  required
                />
              </Field>
              <Field label="City" htmlFor="addrCity" required>
                <Input
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  autoComplete="address-level2"
                  required
                />
              </Field>
              <div className="sm:col-span-2">
                <Button type="submit" size="sm" loading={addingAddress}>
                  {tCommon("save")}
                </Button>
              </div>
            </form>
          )}

          {addresses.length === 0 && !showAddressForm && (
            <p className="py-2 text-sm text-muted-foreground">{tCommon("empty")}</p>
          )}
        </CardContent>
      </Card>

      {/* --------------------------------------------------------- favourites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="size-4 text-primary" aria-hidden />
            {t("favourites")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {favorites.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">{t("noFavourites")}</p>
          ) : (
            <ul className="space-y-2">
              {favorites.map((favorite) => {
                const name =
                  locale === "de" && favorite.menuItem.nameDe
                    ? favorite.menuItem.nameDe
                    : favorite.menuItem.name;

                return (
                  <li
                    key={favorite.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-2"
                  >
                    <DishImage
                      src={favorite.menuItem.image}
                      alt={name}
                      sizes="48px"
                      className="size-12 shrink-0 overflow-hidden rounded-md"
                    />
                    <Link
                      href={`/menu/${favorite.menuItem.id}`}
                      className="min-w-0 flex-1 text-sm font-medium hover:underline"
                    >
                      {name}
                    </Link>
                    <span className="shrink-0 text-sm tabular-nums">
                      {formatCurrency(favorite.menuItem.price, locale)}
                    </span>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeFavorite(favorite.menuItem.id)}
                      aria-label={`${t("noFavourites")} ${name}`}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------- password */}
      <Card>
        <CardHeader>
          <CardTitle>{t("changePassword")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void savePassword();
            }}
          >
            <Field
              label={t("currentPassword")}
              htmlFor="currentPassword"
              error={passwordErrors.currentPassword}
              className="sm:col-span-2"
            >
              <Input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, currentPassword: e.target.value })
                }
                autoComplete="current-password"
              />
            </Field>

            <Field
              label={t("newPassword")}
              htmlFor="newPassword"
              error={passwordErrors.password}
              hint="At least 8 characters, with a letter and a number"
            >
              <Input
                type="password"
                value={passwords.password}
                onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
                autoComplete="new-password"
              />
            </Field>

            <Field
              label={t("confirmPassword")}
              htmlFor="confirmPassword"
              error={passwordErrors.confirmPassword}
            >
              <Input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirmPassword: e.target.value })
                }
                autoComplete="new-password"
              />
            </Field>

            <div className="sm:col-span-2">
              <Button type="submit" variant="secondary" loading={savingPassword}>
                {t("changePassword")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        block
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-destructive"
      >
        <LogOut aria-hidden />
        Sign out
      </Button>
    </div>
  );
}
