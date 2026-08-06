import {
  DEFAULT_THRESHOLDS,
  nextTier,
  parseThresholds,
  progressToNextTier,
  tierForSpend,
} from "@/lib/loyalty";

describe("tierForSpend", () => {
  it("maps spend onto the right tier", () => {
    expect(tierForSpend(0)).toBe("BRONZE");
    expect(tierForSpend(249)).toBe("BRONZE");
    expect(tierForSpend(250)).toBe("SILVER");
    expect(tierForSpend(999)).toBe("SILVER");
    expect(tierForSpend(1000)).toBe("GOLD");
    expect(tierForSpend(2500)).toBe("PLATINUM");
    expect(tierForSpend(999_999)).toBe("PLATINUM");
  });

  it("honours custom thresholds", () => {
    const thresholds = { SILVER: 50, GOLD: 100, PLATINUM: 200 };
    expect(tierForSpend(60, thresholds)).toBe("SILVER");
    expect(tierForSpend(150, thresholds)).toBe("GOLD");
  });
});

describe("parseThresholds", () => {
  it("falls back to the defaults on junk input", () => {
    expect(parseThresholds(null)).toEqual(DEFAULT_THRESHOLDS);
    expect(parseThresholds("nonsense")).toEqual(DEFAULT_THRESHOLDS);
  });

  it("fills in missing keys", () => {
    expect(parseThresholds({ SILVER: 100 })).toEqual({
      SILVER: 100,
      GOLD: DEFAULT_THRESHOLDS.GOLD,
      PLATINUM: DEFAULT_THRESHOLDS.PLATINUM,
    });
  });
});

describe("nextTier", () => {
  it("walks up the ladder", () => {
    expect(nextTier("BRONZE")).toBe("SILVER");
    expect(nextTier("SILVER")).toBe("GOLD");
    expect(nextTier("GOLD")).toBe("PLATINUM");
  });

  it("stops at the top", () => {
    expect(nextTier("PLATINUM")).toBeNull();
  });
});

describe("progressToNextTier", () => {
  it("reports how far there is to go", () => {
    const progress = progressToNextTier(100, "BRONZE");
    expect(progress.next).toBe("SILVER");
    expect(progress.remaining).toBe(150);
    expect(progress.percent).toBe(40);
  });

  it("measures progress within the current band, not from zero", () => {
    // Silver starts at 250, gold at 1000 — 625 is halfway through the band.
    const progress = progressToNextTier(625, "SILVER");
    expect(progress.next).toBe("GOLD");
    expect(progress.percent).toBe(50);
  });

  it("reports complete at the top tier", () => {
    const progress = progressToNextTier(5000, "PLATINUM");
    expect(progress.next).toBeNull();
    expect(progress.percent).toBe(100);
    expect(progress.remaining).toBe(0);
  });
});
