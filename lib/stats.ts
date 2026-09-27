import type {
  DayRecord,
  WeeklyReview,
  MonthlyReview,
  DashboardStats,
  PctDelta,
  PointDelta,
} from "./types";
import {
  addDays,
  daysInRange,
  mondayOf,
  sundayOf,
  previousWeekStart,
  monthOf,
  firstOfMonth,
  lastOfMonth,
  previousMonth,
} from "./dates";

export interface StatsInput {
  today: string; // YYYY-MM-DD
  rangeDays: number; // chart window, e.g. 30 / 90 / 365
  days: DayRecord[];
  weekly: WeeklyReview[];
  monthly: MonthlyReview[];
  dailyGoal: number;
}

function pctDelta(current: number, previous: number): PctDelta {
  const pct = previous === 0 ? null : ((current - previous) / previous) * 100;
  return { current, previous, pct };
}

function pointDelta(current: number | null, previous: number | null): PointDelta {
  const diff =
    current === null || previous === null ? null : current - previous;
  return { current, previous, diff };
}

export function computeStats(input: StatsInput): DashboardStats {
  const { today, rangeDays, days, weekly, monthly, dailyGoal } = input;

  const dayMap = new Map<string, DayRecord>();
  for (const d of days) dayMap.set(d.date, d);
  const weeklyMap = new Map<string, WeeklyReview>();
  for (const w of weekly) weeklyMap.set(w.week_start, w);
  const monthlyMap = new Map<string, MonthlyReview>();
  for (const m of monthly) monthlyMap.set(m.month, m);

  const pomos = (date: string) => dayMap.get(date)?.pomodoros ?? 0;
  const sumRange = (from: string, to: string) =>
    daysInRange(from, to).reduce((acc, d) => acc + pomos(d), 0);

  // --- series for the chart window ---
  const from = addDays(today, -(rangeDays - 1));
  const series = daysInRange(from, today).map((date) => {
    const rec = dayMap.get(date);
    return { date, pomodoros: rec?.pomodoros ?? 0, quality: rec?.quality ?? null };
  });

  // --- weekly quality points (from weekly reviews) within the window ---
  const weeklyQuality = weekly
    .filter((w) => w.week_start >= mondayOf(from) && w.week_start <= today)
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .map((w) => ({ weekStart: w.week_start, quality: w.quality }));

  // --- totals ---
  const weekStart = mondayOf(today);
  const monthStr = monthOf(today);
  const monthStart = firstOfMonth(monthStr);
  const totals = {
    today: pomos(today),
    week: sumRange(weekStart, today),
    month: sumRange(monthStart, today),
    allTime: days.reduce((acc, d) => acc + d.pomodoros, 0),
  };

  // --- streak: consecutive days ending today meeting the daily goal ---
  let streak = 0;
  let cursor = today;
  while (dailyGoal > 0 && pomos(cursor) >= dailyGoal) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  // --- averages (from reviews of the current period) ---
  const averages = {
    weekQuality: weeklyMap.get(weekStart)?.quality ?? null,
    monthQuality: monthlyMap.get(monthStr)?.quality ?? null,
  };

  // --- deltas ---
  const prevWeekStart = previousWeekStart(weekStart);
  const wowPomo = pctDelta(
    sumRange(weekStart, sundayOf(today)),
    sumRange(prevWeekStart, addDays(prevWeekStart, 6)),
  );
  const wowQuality = pointDelta(
    weeklyMap.get(weekStart)?.quality ?? null,
    weeklyMap.get(prevWeekStart)?.quality ?? null,
  );

  const prevMonth = previousMonth(monthStr);
  const momPomo = pctDelta(
    sumRange(monthStart, lastOfMonth(monthStr)),
    sumRange(firstOfMonth(prevMonth), lastOfMonth(prevMonth)),
  );
  const momQuality = pointDelta(
    monthlyMap.get(monthStr)?.quality ?? null,
    monthlyMap.get(prevMonth)?.quality ?? null,
  );

  return {
    range: { from, to: today },
    dailyGoal,
    totals,
    streak,
    series,
    weeklyQuality,
    averages,
    deltas: {
      weekOverWeek: { pomodoros: wowPomo, quality: wowQuality },
      monthOverMonth: { pomodoros: momPomo, quality: momQuality },
    },
  };
}
