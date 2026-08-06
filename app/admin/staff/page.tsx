import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { StaffManager } from "@/components/admin/staff-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { currentUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { formatDateTime } from "@/lib/utils";
import { STAFF_ROLES } from "@/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Staff", robots: { index: false } };

export default async function AdminStaffPage() {
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const me = await currentUser();

  const [staff, activity] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: STAFF_ROLES }, isDeleted: false },
      orderBy: [{ role: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        user: { select: { firstName: true, lastName: true, role: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("staff")}</h1>

      <StaffManager staff={serialize(staff)} currentUserId={me?.id ?? ""} />

      <Card>
        <CardHeader>
          <CardTitle>{t("activityLog")}</CardTitle>
        </CardHeader>
        <CardContent className="scroll-x p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-2 font-medium">When</th>
                <th className="px-5 py-2 font-medium">Who</th>
                <th className="px-5 py-2 font-medium">Action</th>
                <th className="px-5 py-2 font-medium">Entity</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-5 py-2.5 text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt, locale)}
                  </td>
                  <td className="px-5 py-2.5">
                    {entry.user
                      ? `${entry.user.firstName} ${entry.user.lastName}`
                      : "System"}
                  </td>
                  <td className="px-5 py-2.5 font-mono text-xs">{entry.action}</td>
                  <td className="px-5 py-2.5 text-xs text-muted-foreground">
                    {entry.entity ?? "—"}
                  </td>
                </tr>
              ))}

              {activity.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                    {t("noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
