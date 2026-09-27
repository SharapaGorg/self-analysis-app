import { describe, it, expect } from "vitest";
import {
  toISODate,
  parseISODate,
  addDays,
  mondayOf,
  sundayOf,
  previousWeekStart,
  monthOf,
  firstOfMonth,
  lastOfMonth,
  previousMonth,
  daysInRange,
  isSunday,
  isFirstOfMonth,
} from "../lib/dates";

describe("addDays", () => {
  it("adds and subtracts across month boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("crosses year boundary", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("mondayOf / sundayOf", () => {
  it("returns Monday for any day of the week", () => {
    // 2026-09-27 is a Sunday.
    expect(mondayOf("2026-09-27")).toBe("2026-09-21");
    expect(sundayOf("2026-09-27")).toBe("2026-09-27");
    // 2026-09-21 is a Monday.
    expect(mondayOf("2026-09-21")).toBe("2026-09-21");
    expect(sundayOf("2026-09-21")).toBe("2026-09-27");
  });
  it("handles weeks spanning a month/year boundary", () => {
    // 2026-01-01 is a Thursday; its Monday is 2025-12-29.
    expect(mondayOf("2026-01-01")).toBe("2025-12-29");
    expect(sundayOf("2026-01-01")).toBe("2026-01-04");
  });
  it("previousWeekStart goes back 7 days", () => {
    expect(previousWeekStart("2026-09-21")).toBe("2026-09-14");
  });
});

describe("month helpers", () => {
  it("monthOf / firstOfMonth / lastOfMonth", () => {
    expect(monthOf("2026-02-15")).toBe("2026-02");
    expect(firstOfMonth("2026-02")).toBe("2026-02-01");
    expect(lastOfMonth("2026-02")).toBe("2026-02-28"); // 2026 not a leap year
    expect(lastOfMonth("2024-02")).toBe("2024-02-29"); // leap year
    expect(lastOfMonth("2026-12")).toBe("2026-12-31");
  });
  it("previousMonth crosses year boundary", () => {
    expect(previousMonth("2026-01")).toBe("2025-12");
    expect(previousMonth("2026-03")).toBe("2026-02");
  });
});

describe("daysInRange", () => {
  it("is inclusive on both ends", () => {
    expect(daysInRange("2026-09-27", "2026-09-29")).toEqual([
      "2026-09-27",
      "2026-09-28",
      "2026-09-29",
    ]);
  });
  it("returns single day when from == to", () => {
    expect(daysInRange("2026-09-27", "2026-09-27")).toEqual(["2026-09-27"]);
  });
  it("returns empty for reversed range", () => {
    expect(daysInRange("2026-09-29", "2026-09-27")).toEqual([]);
  });
});

describe("isSunday / isFirstOfMonth", () => {
  it("detects Sunday", () => {
    expect(isSunday("2026-09-27")).toBe(true);
    expect(isSunday("2026-09-28")).toBe(false);
  });
  it("detects first of month", () => {
    expect(isFirstOfMonth("2026-09-01")).toBe(true);
    expect(isFirstOfMonth("2026-09-02")).toBe(false);
  });
});

describe("round-trip", () => {
  it("toISODate/parseISODate are inverse", () => {
    const s = "2026-07-04";
    expect(toISODate(parseISODate(s))).toBe(s);
  });
});
