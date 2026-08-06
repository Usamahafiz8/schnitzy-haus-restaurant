import { forbidden, handler, noContent, notFound, ok, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export const PUT = handler(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { id } = await params;

  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!notification) throw notFound("Notification not found");
  if (notification.userId !== user.id) throw forbidden();

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return ok(updated);
});

export const DELETE = handler(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { id } = await params;

  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!notification) throw notFound("Notification not found");
  if (notification.userId !== user.id) throw forbidden();

  await prisma.notification.delete({ where: { id } });

  return noContent();
});
