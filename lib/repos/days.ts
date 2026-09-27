import { getDb } from "../db";
import type { DayRecord } from "../types";

export function getDay(date: string): DayRecord | null {
  const row = getDb()
    .prepare("SELECT * FROM days WHERE date = ?")
    .get(date) as DayRecord | undefined;
  return row ?? null;
}

export function getDaysInRange(from: string, to: string): DayRecord[] {
  return getDb()
    .prepare("SELECT * FROM days WHERE date >= ? AND date <= ? ORDER BY date")
    .all(from, to) as DayRecord[];
}

export function getAllDays(): DayRecord[] {
  return getDb().prepare("SELECT * FROM days ORDER BY date").all() as DayRecord[];
}

export interface DayUpsert {
  pomodoros?: number;
  quality?: number | null;
  review?: string | null;
}

export function upsertDay(date: string, patch: DayUpsert): DayRecord {
  const existing = getDay(date);
  const pomodoros = patch.pomodoros ?? existing?.pomodoros ?? 0;
  const quality = patch.quality !== undefined ? patch.quality : existing?.quality ?? null;
  const review = patch.review !== undefined ? patch.review : existing?.review ?? null;
  const updated_at = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO days (date, pomodoros, quality, review, updated_at)
       VALUES (@date, @pomodoros, @quality, @review, @updated_at)
       ON CONFLICT(date) DO UPDATE SET
         pomodoros = @pomodoros,
         quality = @quality,
         review = @review,
         updated_at = @updated_at`,
    )
    .run({ date, pomodoros, quality, review, updated_at });

  return getDay(date)!;
}
