import { describe, expect, it } from "vitest";

import {
  FIXED_DASHBOARD_RANGES,
  isDashboardRange,
  rangeStartIso,
  RANGE_TO_MS,
} from "./index";

describe("shared dashboard range helpers", () => {
  it("keeps only fixed allowed ranges", () => {
    expect(FIXED_DASHBOARD_RANGES).toEqual(["90m", "24h", "7d", "30d"]);
  });

  it("validates ranges correctly", () => {
    expect(isDashboardRange("90m")).toBe(true);
    expect(isDashboardRange("24h")).toBe(true);
    expect(isDashboardRange("7d")).toBe(true);
    expect(isDashboardRange("30d")).toBe(true);
    expect(isDashboardRange("6h")).toBe(false);
  });

  it("calculates range start timestamp from now", () => {
    const now = new Date("2026-01-01T12:00:00.000Z");
    const start = rangeStartIso("90m", now);
    expect(start).toBe("2026-01-01T10:30:00.000Z");
    expect(RANGE_TO_MS["90m"]).toBe(5_400_000);
  });
});
