"use client";

import { useEffect, useRef, useState } from "react";
import type { Task } from "@/lib/types";

export default function TaskList({
  date,
  onHasTasksChange,
}: {
  date: string;
  onHasTasksChange?: (hasTasks: boolean) => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPlanned, setNewPlanned] = useState(1);

  // Mirror of `tasks` for reading the latest snapshot inside async handlers
  // without closing over a stale render value (revert-on-error uses this).
  const tasksRef = useRef<Task[]>([]);
  useEffect(() => {
    tasksRef.current = tasks;
    onHasTasksChange?.(tasks.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/days/${date}/tasks`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((list: Task[]) => {
        if (cancelled) return;
        setTasks(list);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(`Не удалось загрузить задачи: ${e.message}`);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function addTask() {
    const title = newTitle.trim();
    if (title === "") return;
    setError(null);
    try {
      const res = await fetch(`/api/days/${date}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, planned: newPlanned }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = (await res.json()) as Task;
      // Functional update: append to whatever is current, never a stale snapshot.
      setTasks((prev) => [...prev, created]);
      setNewTitle("");
      setNewPlanned(1);
    } catch (e) {
      setError(`Не удалось добавить: ${(e as Error).message}`);
    }
  }

  async function patchTask(id: number, patch: Partial<Task>) {
    setError(null);
    const snapshot = tasksRef.current; // for revert on failure
    // Optimistic, functional update.
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // No success reconcile: the server echoes the same values we already
      // applied, and overwriting here would clobber edits typed meanwhile.
    } catch (e) {
      setTasks(snapshot);
      setError(`Не удалось сохранить: ${(e as Error).message}`);
    }
  }

  async function removeTask(id: number) {
    setError(null);
    const snapshot = tasksRef.current;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      setTasks(snapshot);
      setError(`Не удалось удалить: ${(e as Error).message}`);
    }
  }

  const totalPlanned = tasks.reduce((s, t) => s + t.planned, 0);
  const totalActual = tasks.reduce((s, t) => s + t.actual, 0);
  const pace =
    totalActual > totalPlanned
      ? "slower"
      : totalActual < totalPlanned
        ? "faster"
        : "onpace";

  if (loading) {
    return <div className="text-sm text-slate-500">Загрузка задач…</div>;
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium uppercase tracking-wide text-slate-400">
        Задачи дня
      </label>

      {tasks.length === 0 && (
        <div className="text-sm text-slate-500">Пока нет задач.</div>
      )}

      {tasks.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1.5"
        >
          <input
            type="checkbox"
            checked={t.done === 1}
            onChange={(e) => patchTask(t.id, { done: e.target.checked ? 1 : 0 })}
            className="h-4 w-4 accent-indigo-500"
            title="Готово"
          />
          <input
            value={t.title}
            onChange={(e) => patchTask(t.id, { title: e.target.value })}
            className={
              "min-w-0 flex-1 bg-transparent text-sm outline-none " +
              (t.done === 1 ? "text-slate-500 line-through" : "text-slate-100")
            }
          />
          <NumBox
            label="план"
            value={t.planned}
            onChange={(v) => patchTask(t.id, { planned: v })}
          />
          <NumBox
            label="факт"
            value={t.actual}
            onChange={(v) => patchTask(t.id, { actual: v })}
          />
          <button
            type="button"
            onClick={() => removeTask(t.id)}
            className="rounded px-1.5 text-slate-500 hover:text-rose-400"
            title="Удалить"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addTask();
          }}
          placeholder="Новая задача…"
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm placeholder:text-slate-600"
        />
        <NumBox label="план" value={newPlanned} onChange={setNewPlanned} />
        <button
          type="button"
          onClick={addTask}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
        >
          + задача
        </button>
      </div>

      {tasks.length > 0 && (
        <div className="pt-1 text-sm">
          Итого:{" "}
          <span className="font-semibold text-slate-200">
            план {totalPlanned} → факт {totalActual}
          </span>{" "}
          <span
            className={
              pace === "slower"
                ? "text-amber-400"
                : pace === "faster"
                  ? "text-emerald-400"
                  : "text-slate-500"
            }
          >
            {pace === "slower"
              ? "(медленнее плана)"
              : pace === "faster"
                ? "(быстрее плана)"
                : "(по плану)"}
          </span>
        </div>
      )}

      {error && <div className="text-xs text-rose-400">{error}</div>}
    </div>
  );
}

function NumBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-xs text-slate-500">
      {label}
      <input
        type="number"
        min={0}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-14 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-center text-sm font-semibold text-slate-100"
      />
    </label>
  );
}
