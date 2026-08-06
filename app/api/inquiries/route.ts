import {
  created,
  currentUser,
  handler,
  ok,
  paginate,
  paginated,
  parseBody,
  requireStaff,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { captureError } from "@/lib/monitoring";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { requireRestaurant } from "@/lib/restaurant";
import { inquirySchema } from "@/lib/validations";

export const GET = handler(async (req: Request) => {
  await requireStaff();
  const url = new URL(req.url);
  const restaurant = await requireRestaurant();

  const status = url.searchParams.get("status");
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Math.min(100, Number(url.searchParams.get("pageSize") ?? 25));

  const where = {
    restaurantId: restaurant.id,
    ...(status ? { status: status as "OPEN" | "ANSWERED" | "CLOSED" } : {}),
  };

  const [items, total, open] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      ...paginate(page, pageSize),
    }),
    prisma.inquiry.count({ where }),
    prisma.inquiry.count({ where: { restaurantId: restaurant.id, status: "OPEN" } }),
  ]);

  return ok({ ...paginated(items, total, page, pageSize), open });
});

export const POST = handler(async (req: Request) => {
  await enforceRateLimit(req, "contact", RATE_LIMITS.contact.limit, RATE_LIMITS.contact.windowMs);

  const input = await parseBody(req, inquirySchema);
  const user = await currentUser();
  const restaurant = await requireRestaurant();

  const inquiry = await prisma.inquiry.create({
    data: {
      restaurantId: restaurant.id,
      userId: user?.id ?? null,
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      subject: input.subject,
      message: input.message,
    },
  });

  // Let the restaurant know something is waiting, without blocking the reply.
  try {
    await sendMail({
      to: restaurant.email,
      subject: `New enquiry: ${input.subject}`,
      html: `<p><strong>${input.name}</strong> (${input.email}${input.phone ? `, ${input.phone}` : ""}) wrote:</p><p>${input.message.replace(/\n/g, "<br>")}</p>`,
    });
  } catch (error) {
    captureError(error, { scope: "inquiry-notify", inquiryId: inquiry.id });
  }

  return created({ id: inquiry.id, received: true });
});
