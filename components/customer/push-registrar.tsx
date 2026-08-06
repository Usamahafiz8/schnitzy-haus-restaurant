"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { postJson } from "@/lib/api-client";
import {
  isFirebaseConfigured,
  onForegroundMessage,
  pushPermission,
  requestPushToken,
} from "@/lib/firebase-client";

/**
 * Keeps the FCM token fresh for signed-in users who have already granted
 * permission, and surfaces foreground pushes as toasts (the service worker only
 * fires when the tab is in the background).
 *
 * Deliberately does NOT prompt — asking for notifications on page load is the
 * pattern users reflexively decline. The opt-in lives on the profile page.
 */
export function PushRegistrar() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated" || !isFirebaseConfigured()) return;
    if (pushPermission() !== "granted") return;

    let cancelled = false;

    void (async () => {
      const token = await requestPushToken();
      if (!token || cancelled) return;
      try {
        await postJson("/notifications/subscribe", {
          token,
          platform: "web",
          userAgent: navigator.userAgent.slice(0, 300),
        });
      } catch {
        // A failed token refresh must never interrupt browsing.
      }
    })();

    const unsubscribe = onForegroundMessage((payload) => {
      if (!payload.title) return;
      toast(payload.title, {
        description: payload.body,
        action: payload.link
          ? { label: "View", onClick: () => router.push(payload.link!) }
          : undefined,
      });
    });

    return () => {
      cancelled = true;
      void unsubscribe.then((off) => off?.());
    };
  }, [status, router]);

  return null;
}
