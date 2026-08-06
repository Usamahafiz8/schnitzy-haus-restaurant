import {
  badRequest,
  handler,
  logActivity,
  noContent,
  notFound,
  ok,
  parseBody,
  requireAdmin,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { updateStaffSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export const PUT = handler(async (req: Request, { params }: Params) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const input = await parseBody(req, updateStaffSchema);

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!target) throw notFound("That user doesn't exist");

  // Removing the last admin would lock everyone out of the dashboard.
  if (target.role === "ADMIN" && input.role && input.role !== "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", isDeleted: false },
    });
    if (adminCount <= 1) {
      throw badRequest("You can't remove the last administrator");
    }
  }

  if (id === admin.id && input.role && input.role !== "ADMIN") {
    throw badRequest("You can't demote your own account");
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
      ...(input.isDeleted !== undefined ? { isDeleted: input.isDeleted } : {}),
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  });

  await logActivity(admin.id, "staff.update", "User", id, { changes: Object.keys(input) });

  return ok(user);
});

export const DELETE = handler(async (_req: Request, { params }: Params) => {
  const admin = await requireAdmin();
  const { id } = await params;

  if (id === admin.id) throw badRequest("You can't remove your own account");

  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!target) throw notFound("That user doesn't exist");

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", isDeleted: false },
    });
    if (adminCount <= 1) throw badRequest("You can't remove the last administrator");
  }

  // Soft delete: their activity log and any orders they touched stay intact.
  await prisma.user.update({
    where: { id },
    data: { isDeleted: true, role: "CUSTOMER" },
  });
  await prisma.session.deleteMany({ where: { userId: id } });

  await logActivity(admin.id, "staff.remove", "User", id);

  return noContent();
});
