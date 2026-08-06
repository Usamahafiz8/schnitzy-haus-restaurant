import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { currentUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getRestaurant } from "@/lib/restaurant";
import { STAFF_ROLES } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The middleware already gates /admin, but a layout check means a session
  // that changes role mid-visit can't keep rendering the dashboard.
  const user = await currentUser();
  if (!user) redirect("/auth/login?callbackUrl=/admin/dashboard");
  if (!STAFF_ROLES.includes(user.role)) redirect("/");

  const [restaurant, pendingOrders, pendingReviews, openInquiries] = await Promise.all([
    getRestaurant(),
    prisma.order.count({
      where: { status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] } },
    }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.inquiry.count({ where: { status: "OPEN" } }),
  ]);

  return (
    <AdminShell
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      }}
      restaurantName={restaurant?.name ?? "Schnitzy Haus"}
      badges={{ orders: pendingOrders, reviews: pendingReviews, support: openInquiries }}
    >
      {children}
    </AdminShell>
  );
}
