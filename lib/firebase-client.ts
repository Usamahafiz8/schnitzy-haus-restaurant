"use client";

import type { Messaging } from "firebase/messaging";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = () =>
  Boolean(config.apiKey && config.projectId && config.messagingSenderId);

let messagingPromise: Promise<Messaging | null> | null = null;

async function getMessagingClient(): Promise<Messaging | null> {
  if (messagingPromise) return messagingPromise;

  messagingPromise = (async () => {
    if (!isFirebaseConfigured() || typeof window === "undefined") return null;

    const [{ initializeApp, getApps, getApp }, messagingModule] = await Promise.all([
      import("firebase/app"),
      import("firebase/messaging"),
    ]);

    // Safari below 16.4 and most in-app browsers can't do web push at all.
    if (!(await messagingModule.isSupported())) return null;

    const app = getApps().length ? getApp() : initializeApp(config);
    return messagingModule.getMessaging(app);
  })();

  return messagingPromise;
}

/**
 * Asks for notification permission and returns an FCM token, or null when the
 * browser can't do push / the user said no. Never throws — a declined prompt is
 * a normal outcome, not an error.
 */
export async function requestPushToken(): Promise<string | null> {
  try {
    const messaging = await getMessagingClient();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
    );

    const { getToken } = await import("firebase/messaging");
    return await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
  } catch {
    return null;
  }
}

/** Foreground messages — the service worker only fires when the tab is hidden. */
export async function onForegroundMessage(
  handler: (payload: { title?: string; body?: string; link?: string }) => void,
) {
  const messaging = await getMessagingClient();
  if (!messaging) return () => undefined;

  const { onMessage } = await import("firebase/messaging");

  return onMessage(messaging, (payload) => {
    handler({
      title: payload.notification?.title,
      body: payload.notification?.body,
      link: payload.data?.link,
    });
  });
}

export function pushPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}
