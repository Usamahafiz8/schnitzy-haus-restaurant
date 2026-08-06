import { requireStaff } from "@/lib/api";
import { ensureCrossInstanceBridge, sseStream } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// See the customer-facing stream for why this is capped; the dashboard's
// EventSource reconnects transparently when the platform ends the invocation.
export const maxDuration = 300;

/** Live feed of incoming orders for the kitchen and front-of-house screens. */
export async function GET() {
  await requireStaff();
  await ensureCrossInstanceBridge();

  return sseStream(["staff"]);
}
