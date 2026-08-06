import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ProfileSettings } from "@/components/customer/profile-settings";
import { currentUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("title"), robots: { index: false } };
}

export default async function ProfilePage() {
  const session = await currentUser();
  if (!session) redirect("/auth/login?callbackUrl=/profile");

  const t = await getTranslations("profile");

  const [user, addresses, favorites] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        locale: true,
        notifyEmail: true,
        notifyPush: true,
        notifySms: true,
        notifyWhatsapp: true,
        notifyMarketing: true,
      },
    }),
    prisma.address.findMany({
      where: { userId: session.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
    prisma.favorite.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      include: {
        menuItem: {
          select: { id: true, name: true, nameDe: true, price: true, image: true },
        },
      },
    }),
  ]);

  if (!user) redirect("/auth/login");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">{t("title")}</h1>

      <ProfileSettings
        user={serialize(user)}
        addresses={serialize(addresses)}
        favorites={serialize(favorites).map((f) => ({
          id: f.id,
          menuItem: f.menuItem,
        }))}
      />
    </div>
  );
}
