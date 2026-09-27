import { describe, it, expect } from "vitest";
import { computeStats, type StatsInput } from "../lib/stats";
import type { DayRecord, WeeklyReview, MonthlyReview } from "../lib/types";

function day(date: string, pomodoros: number, quality: number | null = null): DayRecord {
  return { date, pomodoros, quality, review: null, updated_at: "" };
}
function week(week_start: string, quality: number | null): WeeklyReview {
  return { week_start, quality, review: null, plan: null, updated_at: "" };
}
function month(month: string, quality: number | null): MonthlyReview {
  return { month, quality, review: null, plan: null, updated_at: "" };
}

// today = Sunday 2026-09-27; week = Mon 2026-09-21 .. Sun 2026-09-27
const base: Omit<StatsInput, "days" | "weekly" | "monthly"> = {
  today: "2026-09-27",
  rangeDays: 30,
  dailyGoal: 8,
};

describe("computeStats totals", () => {
  it("sums today / week / month / all-time", () => {
    const days = [
      day("2026-08-31", 5), // previous month
      day("2026-09-20", 3), // previous week (Sun)
      day("2026-09-21", 8), // this week Mon
      day("2026-09-27", 4), // today
    ];
    const s = computeStats({ ...base, days, weekly: [], monthly: [] });
    expect(s.totals.today).toBe(4);
    expect(s.totals.week).toBe(12); // 8 + 4
    expect(s.totals.month).toBe(15); // 3 + 8 + 4 (all in September up to today)
    expect(s.totals.allTime).toBe(20);
  });
});

describe("computeStats streak", () => {
  it("counts consecutive days ending today that meet the goal", () => {
    const days = [
      day("2026-09-24", 9),
      day("2026-09-25", 8),
      day("2026-09-26", 10),
      day("2026-09-27", 8),
    ];
    const s = computeStats({ ...base, days, weekly: [], monthly: [] });
    expect(s.streak).toBe(4);
  });
  it("is zero when today misses the goal", () => {
    const days = [day("2026-09-26", 10), day("2026-09-27", 3)];
    const s = computeStats({ ...base, days, weekly: [], monthly: [] });
    expect(s.streak).toBe(0);
  });
  it("stops at the first miss", () => {
    const days = [
      day("2026-09-25", 2), // miss
      day("2026-09-26", 9),
      day("2026-09-27", 9),
    ];
    const s = computeStats({ ...base, days, weekly: [], monthly: [] });
    expect(s.streak).toBe(2);
  });
});

describe("computeStats deltas", () => {
  it("computes week-over-week pomodoro pct", () => {
    const days = [
      // previous week Mon 2026-09-14 .. Sun 2026-09-20
      day("2026-09-15", 10),
      // this week
      day("2026-09-21", 5),
    ];
    const s = computeStats({ ...base, days, weekly: [], monthly: [] });
    expect(s.deltas.weekOverWeek.pomodoros.current).toBe(5);
    expect(s.deltas.weekOverWeek.pomodoros.previous).toBe(10);
    expect(s.deltas.weekOverWeek.pomodoros.pct).toBe(-50);
  });
  it("returns null pct when previous period is empty", () => {
    const days = [day("2026-09-21", 5)];
    const s = computeStats({ ...base, days, weekly: [], monthly: [] });
    expect(s.deltas.weekOverWeek.pomodoros.pct).toBeNull();
  });
  it("computes week-over-week quality diff from weekly reviews", () => {
    const weekly = [week("2026-09-14", 6), week("2026-09-21", 8)];
    const s = computeStats({ ...base, days: [], weekly, monthly: [] });
    expect(s.deltas.weekOverWeek.quality.diff).toBe(2);
  });
  it("computes month-over-month quality diff from monthly reviews", () => {
    const monthly = [month("2026-08", 5), month("2026-09", 9)];
    const s = computeStats({ ...base, days: [], weekly: [], monthly });
    expect(s.deltas.monthOverMonth.quality.diff).toBe(4);
    expect(s.deltas.monthOverMonth.quality.current).toBe(9);
  });
});

describe("computeStats averages & series", () => {
  it("pulls current week/month quality from reviews", () => {
    const s = computeStats({
      ...base,
      days: [],
      weekly: [week("2026-09-21", 7)],
      monthly: [month("2026-09", 8)],
    });
    expect(s.averages.weekQuality).toBe(7);
    expect(s.averages.monthQuality).toBe(8);
  });
  it("builds a series covering the range window ending today", () => {
    const s = computeStats({
      ...base,
      rangeDays: 7,
      days: [day("2026-09-27", 4, 9)],
      weekly: [],
      monthly: [],
    });
    expect(s.series).toHaveLength(7);
    expect(s.series[0].date).toBe("2026-09-21");
    expect(s.series[6].date).toBe("2026-09-27");
    expect(s.series[6].pomodoros).toBe(4);
    expect(s.series[6].quality).toBe(9);
    expect(s.series[0].pomodoros).toBe(0);
  });
});
