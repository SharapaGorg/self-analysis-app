import { getDb } from "../db";
import type { Task } from "../types";
import { recomputePomodoros, getDay, upsertDay } from "./days";

export function listTasks(date: string): Task[] {
  return getDb()
    .prepare("SELECT * FROM tasks WHERE date = ? ORDER BY sort_order, id")
    .all(date) as Task[];
}

export function getTask(id: number): Task | null {
  const row = getDb()
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(id) as Task | undefined;
  return row ?? null;
}

export function createTask(date: string, title: string, planned: number): Task {
  const db = getDb();
  // Ensure the owning day row exists so day-level fields can be edited later.
  if (!getDay(date)) upsertDay(date, {});

  const next = db
    .prepare(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM tasks WHERE date = ?",
    )
    .get(date) as { n: number };
  const updated_at = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO tasks (date, title, planned, actual, done, sort_order, updated_at)
       VALUES (?, ?, ?, 0, 0, ?, ?)`,
    )
    .run(date, title, planned, next.n, updated_at);

  recomputePomodoros(date);
  return getTask(Number(info.lastInsertRowid))!;
}

export interface TaskPatch {
  title?: string;
  planned?: number;
  actual?: number;
  done?: 0 | 1;
  sort_order?: number;
}

export function updateTask(id: number, patch: TaskPatch): Task {
  const existing = getTask(id);
  if (!existing) throw new Error(`Task ${id} not found`);

  const next = {
    title: patch.title ?? existing.title,
    planned: patch.planned ?? existing.planned,
    actual: patch.actual ?? existing.actual,
    done: patch.done ?? existing.done,
    sort_order: patch.sort_order ?? existing.sort_order,
    updated_at: new Date().toISOString(),
    id,
  };
  getDb()
    .prepare(
      `UPDATE tasks SET
         title = @title,
         planned = @planned,
         actual = @actual,
         done = @done,
         sort_order = @sort_order,
         updated_at = @updated_at
       WHERE id = @id`,
    )
    .run(next);

  recomputePomodoros(existing.date);
  return getTask(id)!;
}

export function deleteTask(id: number): void {
  const db = getDb();
  const existing = getTask(id);
  if (!existing) return;
  db.prepare("DELETE FROM tasks WHERE id = ?").run(id);

  // recomputePomodoros no-ops when a day has zero tasks (to protect legacy
  // manual days). But a day whose last task we just deleted WAS task-driven,
  // so its total must drop to 0 rather than keep the stale sum.
  const remaining = db
    .prepare("SELECT COUNT(*) AS n FROM tasks WHERE date = ?")
    .get(existing.date) as { n: number };
  if (remaining.n === 0) {
    db.prepare(
      "UPDATE days SET pomodoros = 0, updated_at = ? WHERE date = ?",
    ).run(new Date().toISOString(), existing.date);
  } else {
    recomputePomodoros(existing.date);
  }
}
