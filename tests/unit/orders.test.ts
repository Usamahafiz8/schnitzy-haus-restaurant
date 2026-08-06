/**
 * @jest-environment node
 *
 * `lib/orders` imports the typed API errors, which pull in `next/server` and its
 * Request/Response globals — those live in the Node environment, not jsdom.
 */
import {
  canTransition,
  CUSTOMER_CANCELLABLE,
  estimateReadyAt,
  STATUS_TRANSITIONS,
} from "@/lib/orders";
import type { OrderStatus } from "@/types";

describe("order status transitions", () => {
  it("allows the normal pickup path", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "PREPARING")).toBe(true);
    expect(canTransition("PREPARING", "READY")).toBe(true);
    expect(canTransition("READY", "DELIVERED")).toBe(true);
  });

  it("allows the delivery detour", () => {
    expect(canTransition("READY", "OUT_FOR_DELIVERY")).toBe(true);
    expect(canTransition("OUT_FOR_DELIVERY", "DELIVERED")).toBe(true);
  });

  it("refuses to move an order backwards", () => {
    expect(canTransition("DELIVERED", "PREPARING")).toBe(false);
    expect(canTransition("READY", "CONFIRMED")).toBe(false);
    expect(canTransition("PREPARING", "PENDING")).toBe(false);
  });

  it("treats delivered and cancelled as terminal", () => {
    expect(STATUS_TRANSITIONS.DELIVERED).toHaveLength(0);
    expect(STATUS_TRANSITIONS.CANCELLED).toHaveLength(0);
  });

  it("treats a no-op as allowed so retries are idempotent", () => {
    const statuses: OrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING", "DELIVERED"];
    for (const status of statuses) {
      expect(canTransition(status, status)).toBe(true);
    }
  });

  it("allows cancelling from any non-terminal state", () => {
    const cancellable: OrderStatus[] = [
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "OUT_FOR_DELIVERY",
    ];
    for (const status of cancellable) {
      expect(canTransition(status, "CANCELLED")).toBe(true);
    }
  });

  it("only lets customers cancel before cooking starts", () => {
    expect(CUSTOMER_CANCELLABLE).toEqual(["PENDING", "CONFIRMED"]);
    expect(CUSTOMER_CANCELLABLE).not.toContain("PREPARING");
  });
});

describe("estimateReadyAt", () => {
  it("honours an explicitly scheduled time", () => {
    const scheduled = new Date(Date.now() + 3600_000);
    expect(estimateReadyAt({ preparationMinutes: 20, orderType: "PICKUP", scheduledFor: scheduled }))
      .toEqual(scheduled);
  });

  it("adds travel time for delivery", () => {
    const pickup = estimateReadyAt({ preparationMinutes: 20, orderType: "PICKUP" });
    const delivery = estimateReadyAt({ preparationMinutes: 20, orderType: "DELIVERY" });

    expect(delivery.getTime() - pickup.getTime()).toBeGreaterThanOrEqual(19 * 60_000);
  });

  it("applies a floor so trivial orders aren't promised instantly", () => {
    const soon = estimateReadyAt({ preparationMinutes: 2, orderType: "PICKUP" });
    expect(soon.getTime() - Date.now()).toBeGreaterThanOrEqual(9 * 60_000);
  });
});
