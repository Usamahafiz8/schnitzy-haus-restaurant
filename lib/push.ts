import "server-only";

import { prisma } from "@/lib/db";
import { captureError, captureMessage } from "@/lib/monitoring";

type Messaging = {
  sendEachForMulticast(message: {
    tokens: string[];
    notification: { title: string; body: string };
    data?: Record<string, string>;
    webpush?: Record<string, unknown>;
  }): Promise<{
    successCount: number;
    failureCount: number;
    responses: { success: boolean; error?: { code: string } }[];
  }>;
};

let messaging: Messaging | null = null;
let resolved = false;

async function getMessaging(): Promise<Messaging | null> {
  if (resolved) return messaging;
  resolved = true;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    captureMessage("FCM is not configured — push notifications will be skipped");
    return null;
  }

  try {
    const admin = await import("firebase-admin");
    const credentials = JSON.parse(raw);

    const app = admin.apps.length
      ? admin.app()
      : admin.initializeApp({
          credential: admin.credential.cert(credentials),
        });

    messaging = admin.messaging(app) as unknown as Messaging;
  } catch (error) {
    captureError(error, { scope: "fcm-init" });
    messaging = null;
  }

  return messaging;
}

export async function sendPushToUser(params: {
  userId: string;
  title: string;
  body: string;
  link?: string;
  data?: Record<string, string>;
}): Promise<{ delivered: boolean; sent: number }> {
  const client = await getMessaging();

  const devices = await prisma.pushDevice.findMany({
    where: { userId: params.userId, isActive: true },
    select: { token: true },
  });

  if (devices.length === 0) return { delivered: false, sent: 0 };

  if (!client) {
    console.info(
      `[push] would send "${params.title}" to ${devices.length} device(s) for ${params.userId}`,
    );
    return { delivered: false, sent: 0 };
  }

  const tokens = devices.map((d) => d.token);

  try {
    const response = await client.sendEachForMulticast({
      tokens,
      notification: { title: params.title, body: params.body },
      data: { ...params.data, link: params.link ?? "/" },
      webpush: {
        fcmOptions: { link: params.link ?? "/" },
        notification: { icon: "/icons/icon-192.png", badge: "/icons/badge.png" },
      },
    });

    // Prune tokens Firebase tells us are dead, otherwise they accumulate forever.
    const dead = response.responses
      .map((r, i) =>
        !r.success &&
        (r.error?.code === "messaging/registration-token-not-registered" ||
          r.error?.code === "messaging/invalid-argument")
          ? tokens[i]
          : null,
      )
      .filter((t): t is string => t !== null);

    if (dead.length) {
      await prisma.pushDevice.updateMany({
        where: { token: { in: dead } },
        data: { isActive: false },
      });
    }

    return { delivered: response.successCount > 0, sent: response.successCount };
  } catch (error) {
    captureError(error, { scope: "push", userId: params.userId });
    return { delivered: false, sent: 0 };
  }
}

export async function sendPushToUsers(params: {
  userIds: string[];
  title: string;
  body: string;
  link?: string;
}) {
  const results = await Promise.all(
    params.userIds.map((userId) => sendPushToUser({ ...params, userId })),
  );
  return {
    sent: results.reduce((total, r) => total + r.sent, 0),
    recipients: results.filter((r) => r.delivered).length,
  };
}
