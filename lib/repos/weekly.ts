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
}

export function upsertWeekly(weekStart: string, patch: WeeklyUpsert): WeeklyReview {
  const existing = getWeekly(weekStart);
  const quality = patch.quality !== undefined ? patch.quality : existing?.quality ?? null;
  const review = patch.review !== undefined ? patch.review : existing?.review ?? null;
  const plan = patch.plan !== undefined ? patch.plan : existing?.plan ?? null;
  const updated_at = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO weekly_reviews (week_start, quality, review, plan, updated_at)
       VALUES (@week_start, @quality, @review, @plan, @updated_at)
       ON CONFLICT(week_start) DO UPDATE SET
         quality = @quality,
         review = @review,
         plan = @plan,
         updated_at = @updated_at`,
    )
    .run({ week_start: weekStart, quality, review, plan, updated_at });

  return getWeekly(weekStart)!;
}
