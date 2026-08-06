import { forbidden, handler, noContent, notFound, ok, parseBody, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { addressSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export const PUT = handler(async (req: Request, { params }: Params) => {
  const user = await requireUser();
  const { id } = await params;
  const input = await parseBody(req, addressSchema.partial());

  const address = await prisma.address.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!address) throw notFound("Address not found");
  if (address.userId !== user.id) throw forbidden();

  const updated = await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    return tx.address.update({
      where: { id },
      data: {
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.line1 !== undefined ? { line1: input.line1 } : {}),
        ...(input.line2 !== undefined ? { line2: input.line2 || null } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
        ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      },
    });
  });

  return ok(updated);
});

export const DELETE = handler(async (_req: Request, { params }: Params) => {
  const user = await requireUser();
  const { id } = await params;

  const address = await prisma.address.findUnique({
    where: { id },
    select: { userId: true, isDefault: true },
  });
  if (!address) throw notFound("Address not found");
  if (address.userId !== user.id) throw forbidden();

  await prisma.address.delete({ where: { id } });

  // Promote another address so the customer always has a default.
  if (address.isDefault) {
    const next = await prisma.address.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (next) {
      await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  return noContent();
});
