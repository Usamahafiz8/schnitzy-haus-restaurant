import { randomBytes, createHash } from "node:crypto";

import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { passwordResetEmail, sendMail } from "@/lib/email";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validations";

export const POST = handler(async (req: Request) => {
  await enforceRateLimit(
    req,
    "forgot-password",
    RATE_LIMITS.passwordReset.limit,
    RATE_LIMITS.passwordReset.windowMs,
  );

  const { email } = await parseBody(req, forgotPasswordSchema);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, firstName: true, locale: true, isDeleted: true },
  });

  // Always report success. Telling the caller whether an address is registered
  // turns this endpoint into an account-enumeration oracle.
  if (user && !user.isDeleted) {
    const token = randomBytes(32).toString("hex");

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 60 * 60_000),
      },
    });

    const mail = passwordResetEmail({
      name: user.firstName,
      token,
      locale: user.locale,
    });
    await sendMail({ ...mail, to: user.email });
  }

  return ok({ sent: true });
});
