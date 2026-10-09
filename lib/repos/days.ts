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
  mistakes?: string | null;
  wins?: string | null;
  conclusions?: string | null;
  mental?: number | null;
  mental_note?: string | null;
  social?: 0 | 1;
}

export function upsertDay(date: string, patch: DayUpsert): DayRecord {
  const existing = getDay(date);
  const pick = <T>(v: T | undefined, prev: T | undefined, fallback: T): T =>
    v !== undefined ? v : prev !== undefined ? prev : fallback;

  const row = {
    date,
    pomodoros: patch.pomodoros ?? existing?.pomodoros ?? 0,
    quality: pick(patch.quality, existing?.quality, null),
    review: pick(patch.review, existing?.review, null),
    mistakes: pick(patch.mistakes, existing?.mistakes, null),
    wins: pick(patch.wins, existing?.wins, null),
    conclusions: pick(patch.conclusions, existing?.conclusions, null),
    mental: pick(patch.mental, existing?.mental, null),
    mental_note: pick(patch.mental_note, existing?.mental_note, null),
    social: pick(patch.social, existing?.social, 0 as 0 | 1),
    updated_at: new Date().toISOString(),
  };

  getDb()
    .prepare(
      `INSERT INTO days (date, pomodoros, quality, review, mistakes, wins, conclusions, mental, mental_note, social, updated_at)
       VALUES (@date, @pomodoros, @quality, @review, @mistakes, @wins, @conclusions, @mental, @mental_note, @social, @updated_at)
       ON CONFLICT(date) DO UPDATE SET
         pomodoros = @pomodoros,
         quality = @quality,
         review = @review,
         mistakes = @mistakes,
         wins = @wins,
         conclusions = @conclusions,
         mental = @mental,
         mental_note = @mental_note,
         social = @social,
         updated_at = @updated_at`,
    )
    .run(row);

  return getDay(date)!;
}
