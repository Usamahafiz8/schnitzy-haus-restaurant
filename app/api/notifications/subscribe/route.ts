import { z } from "zod";

import { handler, ok, parseBody, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { pushSubscribeSchema } from "@/lib/validations";

/** Registers an FCM token for this browser/device. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const input = await parseBody(req, pushSubscribeSchema);

  // A token can migrate between accounts on a shared device, so reassign
  // rather than reject.
  const device = await prisma.pushDevice.upsert({
    where: { token: input.token },
    create: {
      userId: user.id,
      token: input.token,
      platform: input.platform,
      userAgent: input.userAgent,
    },
    update: {
      userId: user.id,
      platform: input.platform,
      userAgent: input.userAgent,
      isActive: true,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { notifyPush: true },
  });

  return ok({ id: device.id, subscribed: true });
});

const unsubscribeSchema = z.object({ token: z.string().min(10) });

export const DELETE = handler(async (req: Request) => {
  const user = await requireUser();
  const { token } = await parseBody(req, unsubscribeSchema);

  await prisma.pushDevice.updateMany({
    where: { token, userId: user.id },
    data: { isActive: false },
  });

  return ok({ unsubscribed: true });
});
