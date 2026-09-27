import { getDb } from "../db";
import type { MonthlyReview } from "../types";

export function getMonthly(month: string): MonthlyReview | null {
  const row = getDb()
    .prepare("SELECT * FROM monthly_reviews WHERE month = ?")
    .get(month) as MonthlyReview | undefined;
  return row ?? null;
}

export function getAllMonthly(): MonthlyReview[] {
  return getDb()
    .prepare("SELECT * FROM monthly_reviews ORDER BY month DESC")
    .all() as MonthlyReview[];
}

export interface MonthlyUpsert {
  quality?: number | null;
  review?: string | null;
  plan?: string | null;
}

export function upsertMonthly(month: string, patch: MonthlyUpsert): MonthlyReview {
  const existing = getMonthly(month);
  const quality = patch.quality !== undefined ? patch.quality : existing?.quality ?? null;
  const review = patch.review !== undefined ? patch.review : existing?.review ?? null;
  const plan = patch.plan !== undefined ? patch.plan : existing?.plan ?? null;
  const updated_at = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO monthly_reviews (month, quality, review, plan, updated_at)
       VALUES (@month, @quality, @review, @plan, @updated_at)
       ON CONFLICT(month) DO UPDATE SET
         quality = @quality,
         review = @review,
         plan = @plan,
         updated_at = @updated_at`,
    )
    .run({ month, quality, review, plan, updated_at });

  return getMonthly(month)!;
}
