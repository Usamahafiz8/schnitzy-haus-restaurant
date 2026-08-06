import { currentUser, forbidden, handler, notFound, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ORDER_DETAIL_INCLUDE } from "@/lib/orders";
import { STAFF_ROLES } from "@/types";

type Params = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Params) => {
  const { id } = await params;
  const user = await currentUser();

  const order = await prisma.order.findUnique({
    where: { id },
    include: ORDER_DETAIL_INCLUDE,
  });

  if (!order) throw notFound("We couldn't find that order");

  const isOwner = user && order.customerId === user.id;
  const isStaff = user && STAFF_ROLES.includes(user.role);

  // Guest orders are reachable with the order id alone — that id is the only
  // handle a guest has, and it's a random UUID.
  const isGuestOrder = order.customerId === null;

  if (!isOwner && !isStaff && !isGuestOrder) {
    throw forbidden("This order belongs to a different account");
  }

  return ok(order);
});
