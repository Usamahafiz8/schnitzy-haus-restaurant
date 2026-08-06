import {
  formatCurrency,
  isOpenAt,
  minutesToTime,
  round2,
  slugify,
  timeToMinutes,
  toDateKey,
  type OpeningHours,
} from "@/lib/utils";

describe("round2", () => {
  it("kills floating-point drift", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(12.345)).toBe(12.35);
    expect(round2(1.005)).toBe(1.01);
  });
});

describe("formatCurrency", () => {
  it("formats euros for both locales", () => {
    expect(formatCurrency(12.5, "en")).toContain("12.50");
    expect(formatCurrency(12.5, "de")).toContain("12,50");
  });

  it("survives a Decimal-like value", () => {
    expect(formatCurrency({ toString: () => "9.99" }, "en")).toContain("9.99");
  });

  it("degrades to zero rather than NaN", () => {
    expect(formatCurrency("not-a-number", "en")).toContain("0.00");
  });
});

describe("time helpers", () => {
  it("round-trips HH:MM", () => {
    expect(timeToMinutes("09:30")).toBe(570);
    expect(minutesToTime(570)).toBe("09:30");
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it("rejects malformed input", () => {
    expect(timeToMinutes("25:00")).toBeNull();
    expect(timeToMinutes("9:5")).toBeNull();
    expect(timeToMinutes("noon")).toBeNull();
  });
});

describe("isOpenAt", () => {
  const hours: OpeningHours = {
    monday: { open: "11:00", close: "22:00" },
    tuesday: { open: "11:00", close: "22:00", closed: true },
    saturday: { open: "18:00", close: "02:00" },
  };

  it("is open inside the window", () => {
    // 2026-08-10 is a Monday.
    expect(isOpenAt(hours, new Date("2026-08-10T14:00:00"))).toBe(true);
  });

  it("is closed outside the window", () => {
    expect(isOpenAt(hours, new Date("2026-08-10T09:00:00"))).toBe(false);
    expect(isOpenAt(hours, new Date("2026-08-10T23:00:00"))).toBe(false);
  });

  it("respects an explicit closed day", () => {
    expect(isOpenAt(hours, new Date("2026-08-11T14:00:00"))).toBe(false);
  });

  it("handles a window that runs past midnight", () => {
    // Saturday 18:00 -> 02:00.
    expect(isOpenAt(hours, new Date("2026-08-15T23:00:00"))).toBe(true);
    expect(isOpenAt(hours, new Date("2026-08-15T01:00:00"))).toBe(true);
    expect(isOpenAt(hours, new Date("2026-08-15T15:00:00"))).toBe(false);
  });

  it("is closed on a day with no entry", () => {
    expect(isOpenAt(hours, new Date("2026-08-12T14:00:00"))).toBe(false);
    expect(isOpenAt({}, new Date())).toBe(false);
  });
});

describe("slugify", () => {
  it("transliterates German characters", () => {
    expect(slugify("Käsespätzle")).toBe("kaesespaetzle");
    expect(slugify("Straße")).toBe("strasse");
    expect(slugify("Schnitzy Haus — Berlin!")).toBe("schnitzy-haus-berlin");
  });
});

describe("toDateKey", () => {
  it("uses the local calendar day, not UTC", () => {
    // 23:30 local on the 9th must not roll forward to the 10th.
    expect(toDateKey(new Date(2026, 7, 9, 23, 30))).toBe("2026-08-09");
    expect(toDateKey(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});
