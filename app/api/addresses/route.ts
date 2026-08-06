import { created, handler, ok, parseBody, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { geocode } from "@/lib/maps";
import { addressSchema } from "@/lib/validations";

export const GET = handler(async () => {
  const user = await requireUser();

  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return ok(addresses);
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const input = await parseBody(req, addressSchema);

  // Geocode server-side when the client didn't supply coordinates, so delivery
  // radius checks work even without the Places autocomplete.
  let { latitude, longitude } = input;
  if (latitude === undefined || longitude === undefined) {
    const point = await geocode(
      `${input.line1}, ${input.postalCode} ${input.city}, ${input.country}`,
    );
    latitude = point?.lat;
    longitude = point?.lng;
  }

  const address = await prisma.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId: user.id } });
    const shouldDefault = input.isDefault || count === 0;

    if (shouldDefault) {
      await tx.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }

    return tx.address.create({
      data: {
        userId: user.id,
        label: input.label,
        line1: input.line1,
        line2: input.line2 || null,
        city: input.city,
        postalCode: input.postalCode,
        country: input.country,
        latitude,
        longitude,
        isDefault: shouldDefault,
      },
    });
  });

  return created(address);
});
