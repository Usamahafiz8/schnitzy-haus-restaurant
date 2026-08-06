import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

import {
  conflict,
  created,
  handler,
  logActivity,
  ok,
  parseBody,
  requireAdmin,
  requireStaff,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { appUrl, passwordResetEmail, sendMail } from "@/lib/email";
import { createHash } from "node:crypto";
import { staffSchema } from "@/lib/validations";
import { STAFF_ROLES } from "@/types";

export const GET = handler(async () => {
  await requireStaff();

  const staff = await prisma.user.findMany({
    where: { role: { in: STAFF_ROLES }, isDeleted: false },
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: { select: { activityLogs: true } },
    },
  });

  return ok(staff);
});

export const POST = handler(async (req: Request) => {
  const admin = await requireAdmin();
  const input = await parseBody(req, staffSchema);

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, role: true, isDeleted: true },
  });

  // Promoting an existing customer is the common case — don't make the admin
  // delete and recreate the account.
  if (existing) {
    if (!existing.isDeleted && STAFF_ROLES.includes(existing.role)) {
      throw conflict("That person is already a staff member");
    }
    const promoted = await prisma.user.update({
      where: { id: existing.id },
      data: { role: input.role, isDeleted: false },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
    await logActivity(admin.id, "staff.promote", "User", promoted.id, { role: input.role });
    return ok(promoted);
  }

  // No password supplied: create the account with an unguessable one and send
  // a set-password link, so credentials are never typed into a form by an admin.
  const temporary = input.password ?? randomBytes(24).toString("base64url");

  const user = await prisma.user.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone || null,
      role: input.role,
      password: await bcrypt.hash(temporary, 12),
      emailVerified: new Date(),
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });

  if (!input.password) {
    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 7 * 24 * 3600_000),
      },
    });
    const mail = passwordResetEmail({ name: user.firstName, token });
    await sendMail({
      ...mail,
      to: user.email,
      subject: `Set up your ${appUrl().replace(/^https?:\/\//, "")} staff account`,
    });
  }

  await logActivity(admin.id, "staff.create", "User", user.id, { role: input.role });

  return created(user);
});
