"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Keeps every dashboard screen live: new orders arrive over SSE, so the kitchen
 * doesn't have to refresh. Plays a short chime the first time the tab has been
 * interacted with (browsers block autoplay before that).
 */
export function NewOrderListener() {
  const t = useTranslations("admin");
  const router = useRouter();
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/orders/admin/events");

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          kind: string;
          orderId?: string;
          orderNumber?: string;
          totalAmount?: number;
          orderType?: string;
        };

        if (payload.kind !== "new-order") return;

        chime();

        toast.success(`${t("newOrder")} ${payload.orderNumber ?? ""}`, {
          description: payload.orderType,
          duration: 12_000,
          action: payload.orderId
            ? {
                label: "Open",
                onClick: () => router.push(`/admin/orders/${payload.orderId}`),
              }
            : undefined,
        });

        router.refresh();
      } catch {
        // Ignore malformed frames.
      }
    };

    return () => source.close();
  }, [router, t]);

  const chime = () => {
    try {
      const context =
        audioRef.current ??
        (audioRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)());

      if (context.state === "suspended") return;

      // Two short notes — audible over a busy kitchen, not startling.
      [880, 1174].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = "sine";

        const start = context.currentTime + index * 0.16;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);

        oscillator.start(start);
        oscillator.stop(start + 0.16);
      });
    } catch {
      // Audio is a nicety, never a requirement.
    }
  };

  return null;
}
