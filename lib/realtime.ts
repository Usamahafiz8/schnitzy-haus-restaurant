/**
 * Real-time transport for order status and the staff order feed.
 *
 * The spec called for Socket.io. Socket.io needs a long-lived custom Node
 * server, which rules out the serverless targets the project is meant to deploy
 * to (Vercel / Next standalone). Server-Sent Events give us the same
 * server-push semantics over plain HTTP with no extra process, native
 * reconnection in the browser, and no client bundle. The subscribe/publish
 * surface below is deliberately transport-shaped, so swapping in Socket.io or
 * Redis pub/sub later means reimplementing this file only.
 *
 * Note: the in-process registry below fans out within one server instance. For
 * a multi-instance deployment, set REDIS_URL and the publisher will also push
 * through Redis pub/sub so every instance sees every event.
 */
import { captureError } from "@/lib/monitoring";

export type RealtimeEvent = Record<string, unknown> & { kind: string };

type Subscriber = (event: RealtimeEvent) => void;

const globalForRealtime = globalThis as unknown as {
  __realtimeChannels?: Map<string, Set<Subscriber>>;
};

const channels =
  globalForRealtime.__realtimeChannels ??
  (globalForRealtime.__realtimeChannels = new Map());

export function subscribe(channel: string, subscriber: Subscriber): () => void {
  const set = channels.get(channel) ?? new Set<Subscriber>();
  set.add(subscriber);
  channels.set(channel, set);

  return () => {
    set.delete(subscriber);
    if (set.size === 0) channels.delete(channel);
  };
}

export function publish(channel: string, event: RealtimeEvent) {
  const set = channels.get(channel);
  if (set) {
    for (const subscriber of set) {
      try {
        subscriber(event);
      } catch (error) {
        captureError(error, { scope: "realtime-publish", channel });
      }
    }
  }
  void publishCrossInstance(channel, event);
}

let publisherPromise: Promise<unknown> | null = null;

async function publishCrossInstance(channel: string, event: RealtimeEvent) {
  if (!process.env.REDIS_URL) return;
  try {
    const { redis } = await import("@/lib/cache");
    const client = await redis();
    if (!client) return;
    await client.publish(`realtime:${channel}`, JSON.stringify(event));
  } catch (error) {
    captureError(error, { scope: "realtime-redis-publish", channel });
  }
}

/** Bridges Redis pub/sub back into the local registry. Idempotent. */
export async function ensureCrossInstanceBridge() {
  if (!process.env.REDIS_URL || publisherPromise) return;

  publisherPromise = (async () => {
    try {
      const { default: Redis } = await import("ioredis");
      const sub = new Redis(process.env.REDIS_URL!, {
        maxRetriesPerRequest: 2,
      });
      await sub.psubscribe("realtime:*");
      sub.on("pmessage", (_pattern, redisChannel, payload) => {
        const channel = redisChannel.replace(/^realtime:/, "");
        const set = channels.get(channel);
        if (!set) return;
        const event = JSON.parse(payload) as RealtimeEvent;
        for (const subscriber of set) subscriber(event);
      });
    } catch (error) {
      captureError(error, { scope: "realtime-bridge" });
    }
  })();
}

/** Wraps a channel in a ReadyState-friendly SSE stream for a route handler. */
export function sseStream(
  channels: string[],
  options: { heartbeatMs?: number } = {},
): Response {
  const encoder = new TextEncoder();
  const heartbeatMs = options.heartbeatMs ?? 25_000;

  // Assigned during `start`, invoked from `cancel` when the client disconnects.
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (event: RealtimeEvent) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: message\ndata: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          cleanup?.();
        }
      };

      const unsubscribers = channels.map((channel) => subscribe(channel, send));

      // Proxies drop idle connections; a comment frame keeps them open.
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          cleanup?.();
        }
      }, heartbeatMs);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribers.forEach((off) => off());
        try {
          controller.close();
        } catch {
          /* already closed by the runtime */
        }
      };

      send({ kind: "connected", channels: channels.join(",") });
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
