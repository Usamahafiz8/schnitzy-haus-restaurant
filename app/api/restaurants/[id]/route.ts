import { handler, notFound, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isOpenAt, type OpeningHours } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;

  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) throw notFound("Restaurant not found");

  // Never expose payment-provider identifiers on a public endpoint.
  const { stripeAccountId: _stripeAccountId, ...safe } = restaurant;

  return ok({
    ...safe,
    isOpenNow: isOpenAt(restaurant.openingHours as OpeningHours),
  });
});
