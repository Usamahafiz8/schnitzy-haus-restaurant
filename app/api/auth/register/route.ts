import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";

import { created, conflict, handler, parseBody } from "@/lib/api";
import { prisma } from "@/lib/db";
import { sendMail, verifyEmailEmail } from "@/lib/email";
import { getRestaurant } from "@/lib/restaurant";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validations";
import { captureError } from "@/lib/monitoring";

const SIGNUP_BONUS_POINTS = 100;

export const POST = handler(async (req: Request) => {
  await enforceRateLimit(req, "register", RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);

  const input = await parseBody(req, registerSchema);

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw conflict("An account with that email already exists");
  }

  const password = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone || null,
      locale: input.locale,
      role: "CUSTOMER",
    },
    select: { id: true, email: true, firstName: true, lastName: true, locale: true },
  });

  // Welcome points, so the rewards screen isn't empty on day one.
  const restaurant = await getRestaurant();
  if (restaurant) {
    const account = await prisma.loyaltyAccount.create({
      data: {
        restaurantId: restaurant.id,
        customerId: user.id,
        points: SIGNUP_BONUS_POINTS,
        lifetimePoints: SIGNUP_BONUS_POINTS,
      },
    });
    await prisma.pointsTransaction.create({
      data: {
        accountId: account.id,
        userId: user.id,
        points: SIGNUP_BONUS_POINTS,
        reason: "SIGNUP_BONUS",
        note: "Welcome to Schnitzy Haus",
      },
    });
  }

  // Email verification is best-effort: a bounced mail must not fail signup.
  try {
    const token = randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 24 * 3600_000),
      },
    });

    const mail = verifyEmailEmail({ name: user.firstName, token, locale: user.locale });
    await sendMail({ ...mail, to: user.email });
  } catch (error) {
    captureError(error, { scope: "register-verify-email", userId: user.id });
  }

  return created({ id: user.id, email: user.email, firstName: user.firstName });
});
