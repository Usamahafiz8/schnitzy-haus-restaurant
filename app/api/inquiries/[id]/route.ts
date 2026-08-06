import {
  handler,
  logActivity,
  notFound,
  ok,
  parseBody,
  requireStaff,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";
import { inquiryResponseSchema } from "@/lib/validations";
import { badRequest } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** Replies to a customer enquiry by email or WhatsApp and records the answer. */
export const POST = handler(async (req: Request, { params }: Params) => {
  const staff = await requireStaff();
  const { id } = await params;
  const input = await parseBody(req, inquiryResponseSchema);

  const inquiry = await prisma.inquiry.findUnique({ where: { id } });
  if (!inquiry) throw notFound("Enquiry not found");

  if (input.channel === "WHATSAPP") {
    if (!inquiry.phone) {
      throw badRequest("This enquiry has no phone number to message");
    }
    await sendWhatsApp({ to: inquiry.phone, body: input.response });
  } else {
    await sendMail({
      to: inquiry.email,
      subject: `Re: ${inquiry.subject}`,
      html: `<p>${input.response.replace(/\n/g, "<br>")}</p>`,
    });
  }

  const updated = await prisma.inquiry.update({
    where: { id },
    data: { response: input.response, status: "ANSWERED", respondedAt: new Date() },
  });

  await logActivity(staff.id, "inquiry.respond", "Inquiry", id, {
    channel: input.channel,
  });

  return ok(updated);
});

export const PUT = handler(async (req: Request, { params }: Params) => {
  const staff = await requireStaff();
  const { id } = await params;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  if (!status || !["OPEN", "ANSWERED", "CLOSED"].includes(status)) {
    throw badRequest("Pass ?status=OPEN|ANSWERED|CLOSED");
  }

  const inquiry = await prisma.inquiry.update({
    where: { id },
    data: { status: status as "OPEN" | "ANSWERED" | "CLOSED" },
  });

  await logActivity(staff.id, "inquiry.status", "Inquiry", id, { status });

  return ok(inquiry);
});
