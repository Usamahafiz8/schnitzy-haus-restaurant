import bcrypt from "bcryptjs";

import {
  badRequest,
  handler,
  logActivity,
  ok,
  parseBody,
  requireUser,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { changePasswordSchema, updateProfileSchema } from "@/lib/validations";

const PROFILE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  image: true,
  locale: true,
  emailVerified: true,
  notifyEmail: true,
  notifyPush: true,
  notifySms: true,
  notifyWhatsapp: true,
  notifyMarketing: true,
  createdAt: true,
} as const;

export const GET = handler(async () => {
  const session = await requireUser();

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: PROFILE_SELECT,
  });

  return ok(user);
});

export const PUT = handler(async (req: Request) => {
  const session = await requireUser();
  const input = await parseBody(req, updateProfileSchema);

  const user = await prisma.user.update({
    where: { id: session.id },
    data: {
      ...input,
      phone: input.phone === "" ? null : input.phone,
    },
    select: PROFILE_SELECT,
  });

  await logActivity(session.id, "profile.update", "User", session.id);

  return ok(user);
});

export const PATCH = handler(async (req: Request) => {
  const session = await requireUser();
  const input = await parseBody(req, changePasswordSchema);

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { password: true },
  });

  if (!user?.password) {
    throw badRequest(
      "This account signs in with Google. Set a password from your Google account instead.",
    );
  }

  const valid = await bcrypt.compare(input.currentPassword, user.password);
  if (!valid) throw badRequest("Your current password is incorrect");

  await prisma.user.update({
    where: { id: session.id },
    data: { password: await bcrypt.hash(input.password, 12) },
  });

  await logActivity(session.id, "profile.password-change", "User", session.id);

  return ok({ changed: true });
});
