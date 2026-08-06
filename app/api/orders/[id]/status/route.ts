import {
  handler,
  logActivity,
  notFound,
  ok,
  parseBody,
  requireStaff,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { captureError } from "@/lib/monitoring";
import { notifyOrderStatus } from "@/lib/notifications";
import { assertTransition } from "@/lib/orders";
import { updateOrderStatusSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

export const PUT = handler(async (req: Request, { params }: Params) => {
  const staff = await requireStaff();
  const { id } = await params;
  const input = await parseBody(req, updateOrderStatusSchema);

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      orderNumber: true,
      orderType: true,
      customerId: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      customer: { select: { locale: true } },
    },
  });

  if (!order) throw notFound("We couldn't find that order");

  assertTransition(order.status, input.status);

  const isDone = input.status === "DELIVERED";

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.order.update({
      where: { id },
      data: {
        status: input.status,
        ...(isDone ? { actualDeliveryTime: new Date() } : {}),
        ...(input.estimatedMinutes !== undefined
          ? {
              estimatedDeliveryTime: new Date(
                Date.now() + input.estimatedMinutes * 60_000,
              ),
            }
          : {}),
      },
    });

    await tx.orderStatusEvent.create({
      data: {
        orderId: id,
        status: input.status,
        note: input.note,
        createdBy: staff.id,
      },
    });

    return record;
  });

  try {
    await notifyOrderStatus({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: input.status,
      customerId: order.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      orderType: order.orderType,
      locale: order.customer?.locale,
    });
  } catch (error) {
    captureError(error, { scope: "order-status-notify", orderId: id });
  }

  await logActivity(staff.id, "order.status", "Order", id, {
    from: order.status,
    to: input.status,
  });

  return ok(updated);
});
