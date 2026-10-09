import { getDb } from "../db";
import type { WeeklyReview } from "../types";

export function getWeekly(weekStart: string): WeeklyReview | null {
  const row = getDb()
    .prepare("SELECT * FROM weekly_reviews WHERE week_start = ?")
    .get(weekStart) as WeeklyReview | undefined;
  return row ?? null;
}

export function getAllWeekly(): WeeklyReview[] {
  return getDb()
    .prepare("SELECT * FROM weekly_reviews ORDER BY week_start DESC")
    .all() as WeeklyReview[];
}

export interface WeeklyUpsert {
  quality?: number | null;
  review?: string | null;
  plan?: string | null;
  mistakes?: string | null;
  wins?: string | null;
  conclusions?: string | null;
}

export function upsertWeekly(weekStart: string, patch: WeeklyUpsert): WeeklyReview {
  const existing = getWeekly(weekStart);
  const pick = <T>(v: T | undefined, prev: T | undefined, fb: T): T =>
    v !== undefined ? v : prev !== undefined ? prev : fb;
  const row = {
    week_start: weekStart,
    quality: pick(patch.quality, existing?.quality, null),
    review: pick(patch.review, existing?.review, null),
    plan: pick(patch.plan, existing?.plan, null),
    mistakes: pick(patch.mistakes, existing?.mistakes, null),
    wins: pick(patch.wins, existing?.wins, null),
    conclusions: pick(patch.conclusions, existing?.conclusions, null),
    updated_at: new Date().toISOString(),
  };

  getDb()
    .prepare(
      `INSERT INTO weekly_reviews (week_start, quality, review, plan, mistakes, wins, conclusions, updated_at)
       VALUES (@week_start, @quality, @review, @plan, @mistakes, @wins, @conclusions, @updated_at)
       ON CONFLICT(week_start) DO UPDATE SET
         quality = @quality,
         review = @review,
         plan = @plan,
         mistakes = @mistakes,
         wins = @wins,
         conclusions = @conclusions,
         updated_at = @updated_at`,
    )
    .run(row);

  return getWeekly(weekStart)!;
}
