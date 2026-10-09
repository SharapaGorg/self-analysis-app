/**
 * One-off migration: split each day's legacy free-text `review` into the three
 * structured fields (mistakes / wins / conclusions) using Haiku.
 *
 * Safe to re-run — only days that still have a non-empty `review` AND no
 * 3-field content are processed. The legacy `review` column is left untouched
 * as an archive.
 *
 * Usage: npx tsx scripts/migrate-reviews.ts
 */
import { getAllDays, upsertDay } from "../lib/repos/days";
import { splitReview, type ThreeFields } from "../lib/llm";

type Splitter = (text: string) => Promise<ThreeFields>;

function hasReview(s: string | null): boolean {
  return typeof s === "string" && s.trim() !== "";
}

export async function migrateReviews(
  split: Splitter = splitReview,
): Promise<{ migrated: number; skipped: number }> {
  let migrated = 0;
  let skipped = 0;

  for (const day of getAllDays()) {
    const needs =
      hasReview(day.review) &&
      !hasReview(day.mistakes) &&
      !hasReview(day.wins) &&
      !hasReview(day.conclusions);
    if (!needs) {
      skipped++;
      continue;
    }
    try {
      const fields = await split(day.review as string);
      upsertDay(day.date, {
        mistakes: fields.mistakes || null,
        wins: fields.wins || null,
        conclusions: fields.conclusions || null,
      });
      migrated++;
    } catch (e) {
      // Fallback: keep the whole text in conclusions so nothing is lost.
      upsertDay(day.date, { conclusions: day.review });
      migrated++;
      // eslint-disable-next-line no-console
      console.error(`split failed for ${day.date}: ${(e as Error).message}`);
    }
  }
  return { migrated, skipped };
}

// CLI entry point: run against the real data.db.
if (require.main === module) {
  migrateReviews()
    .then((r) => {
      // eslint-disable-next-line no-console
      console.log(`migrated ${r.migrated}, skipped ${r.skipped}`);
      process.exit(0);
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      process.exit(1);
    });
}
