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
  mistakes?: string | null;
  wins?: string | null;
  conclusions?: string | null;
}

export function upsertMonthly(month: string, patch: MonthlyUpsert): MonthlyReview {
  const existing = getMonthly(month);
  const pick = <T>(v: T | undefined, prev: T | undefined, fb: T): T =>
    v !== undefined ? v : prev !== undefined ? prev : fb;
  const row = {
    month,
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
      `INSERT INTO monthly_reviews (month, quality, review, plan, mistakes, wins, conclusions, updated_at)
       VALUES (@month, @quality, @review, @plan, @mistakes, @wins, @conclusions, @updated_at)
       ON CONFLICT(month) DO UPDATE SET
         quality = @quality,
         review = @review,
         plan = @plan,
         mistakes = @mistakes,
         wins = @wins,
         conclusions = @conclusions,
         updated_at = @updated_at`,
    )
    .run(row);

  return getMonthly(month)!;
}
