import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";

import { badRequest, handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validations";

export const POST = handler(async (req: Request) => {
  await enforceRateLimit(
    req,
    "reset-password",
    RATE_LIMITS.passwordReset.limit,
    RATE_LIMITS.passwordReset.windowMs,
  );

  const input = await parseBody(req, resetPasswordSchema);
  const tokenHash = createHash("sha256").update(input.token).digest("hex");

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, isDeleted: true } } },
  });

  if (!record || record.usedAt || record.expiresAt < new Date() || record.user.isDeleted) {
    throw badRequest("That reset link has expired. Please request a new one.");
  }

  const password = await bcrypt.hash(input.password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Any other outstanding link for this account is now void.
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    // Sign out every existing session — a password reset should evict a thief.
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  return ok({ reset: true });
});
