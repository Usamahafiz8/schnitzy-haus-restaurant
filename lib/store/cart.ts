"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { CartLine, OrderType } from "@/types";
import { round2 } from "@/lib/utils";

type CartState = {
  lines: CartLine[];
  orderType: OrderType;
  couponCode: string | null;
  pointsToRedeem: number;
  tipAmount: number;
  /** Set once the store has rehydrated, so SSR and client markup agree. */
  hydrated: boolean;

  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (itemId: string, quantity: number, notes?: string) => void;
  increment: (itemId: string, notes?: string) => void;
  decrement: (itemId: string, notes?: string) => void;
  remove: (itemId: string, notes?: string) => void;
  setNotes: (itemId: string, notes: string) => void;
  setOrderType: (orderType: OrderType) => void;
  setCoupon: (code: string | null) => void;
  setPoints: (points: number) => void;
  setTip: (amount: number) => void;
  clear: () => void;

  count: () => number;
  subtotal: () => number;
};

/** Same dish with different notes is a separate line, like a real ticket. */
const keyOf = (itemId: string, notes?: string) => `${itemId}::${notes ?? ""}`;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      orderType: "PICKUP",
      couponCode: null,
      pointsToRedeem: 0,
      tipAmount: 0,
      hydrated: false,

      add: (line, quantity = 1) =>
        set((state) => {
          const key = keyOf(line.itemId, line.specialNotes);
          const existing = state.lines.find(
            (l) => keyOf(l.itemId, l.specialNotes) === key,
          );

          if (existing) {
            return {
              lines: state.lines.map((l) =>
                keyOf(l.itemId, l.specialNotes) === key
                  ? { ...l, quantity: Math.min(50, l.quantity + quantity) }
                  : l,
              ),
            };
          }

          return { lines: [...state.lines, { ...line, quantity }] };
        }),

      setQuantity: (itemId, quantity, notes) =>
        set((state) => {
          const key = keyOf(itemId, notes);
          if (quantity <= 0) {
            return {
              lines: state.lines.filter(
                (l) => keyOf(l.itemId, l.specialNotes) !== key,
              ),
            };
          }
          return {
            lines: state.lines.map((l) =>
              keyOf(l.itemId, l.specialNotes) === key
                ? { ...l, quantity: Math.min(50, quantity) }
                : l,
            ),
          };
        }),

      increment: (itemId, notes) => {
        const line = get().lines.find(
          (l) => keyOf(l.itemId, l.specialNotes) === keyOf(itemId, notes),
        );
        if (line) get().setQuantity(itemId, line.quantity + 1, notes);
      },

      decrement: (itemId, notes) => {
        const line = get().lines.find(
          (l) => keyOf(l.itemId, l.specialNotes) === keyOf(itemId, notes),
        );
        if (line) get().setQuantity(itemId, line.quantity - 1, notes);
      },

      remove: (itemId, notes) =>
        set((state) => ({
          lines: state.lines.filter(
            (l) => keyOf(l.itemId, l.specialNotes) !== keyOf(itemId, notes),
          ),
        })),

      setNotes: (itemId, notes) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.itemId === itemId ? { ...l, specialNotes: notes } : l,
          ),
        })),

      setOrderType: (orderType) => set({ orderType }),
      setCoupon: (couponCode) => set({ couponCode }),
      setPoints: (pointsToRedeem) => set({ pointsToRedeem: Math.max(0, pointsToRedeem) }),
      setTip: (tipAmount) => set({ tipAmount: Math.max(0, round2(tipAmount)) }),

      clear: () =>
        set({ lines: [], couponCode: null, pointsToRedeem: 0, tipAmount: 0 }),

      count: () => get().lines.reduce((total, l) => total + l.quantity, 0),
      subtotal: () =>
        round2(get().lines.reduce((total, l) => total + l.price * l.quantity, 0)),
    }),
    {
      name: "schnitzy-cart",
      // Guarded because this module is also evaluated during SSR, where there
      // is no localStorage. Returning undefined makes zustand skip persistence
      // on the server instead of throwing.
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? undefined! : window.localStorage,
      ),
      partialize: (state) => ({
        lines: state.lines,
        orderType: state.orderType,
        couponCode: state.couponCode,
        pointsToRedeem: state.pointsToRedeem,
        tipAmount: state.tipAmount,
      }),
    },
  ),
);

// The server renders an empty cart; flipping `hydrated` only after localStorage
// has been merged in keeps the first client paint identical to the server's.
//
// `useCart.persist` exists only in the browser — when the storage getter above
// returns undefined, zustand skips the persist middleware entirely and never
// attaches the API, so this must not run during SSR.
if (typeof window !== "undefined") {
  useCart.persist?.onFinishHydration(() => {
    useCart.setState({ hydrated: true });
  });

  if (useCart.persist?.hasHydrated()) {
    useCart.setState({ hydrated: true });
  }
}
