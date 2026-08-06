import { currentUser, forbidden, notFound } from "@/lib/api";
import { prisma } from "@/lib/db";
import { ensureCrossInstanceBridge, sseStream } from "@/lib/realtime";
import { STAFF_ROLES } from "@/types";

type Params = { params: Promise<{ id: string }> };

// A streaming response must not be statically rendered or cached.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Serverless platforms cap how long a function may run (60s on Vercel Hobby,
// up to 300s on Pro). The stream is cut at that point; EventSource reconnects
// on its own, so the customer sees an uninterrupted feed either way.
export const maxDuration = 300;

/**
 * Live order status over Server-Sent Events. The browser's native EventSource
 * handles reconnection, so the client component stays tiny.
 */
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, customerId: true },
  });

  if (!order) throw notFound("We couldn't find that order");

  const user = await currentUser();
  const allowed =
    order.customerId === null ||
    (user && (order.customerId === user.id || STAFF_ROLES.includes(user.role)));

  if (!allowed) throw forbidden();

  await ensureCrossInstanceBridge();

  return sseStream([`order:${id}`]);
}
