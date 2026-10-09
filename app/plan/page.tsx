"use client";

import { useEffect, useMemo, useState } from "react";
import TaskList from "@/components/TaskList";
import { toISODate, addDays, parseISODate } from "@/lib/dates";
import type { DayRecord } from "@/lib/types";

export default function PlanPage() {
  const tomorrow = useMemo(() => addDays(toISODate(new Date()), 1), []);
  const human = useMemo(
    () =>
      parseISODate(tomorrow).toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [tomorrow],
  );

  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/days/${tomorrow}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: DayRecord) => {
        if (cancelled) return;
        setPlan(d.plan ?? "");
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(`Не удалось загрузить: ${e.message}`);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tomorrow]);

  async function savePlan() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/days/${tomorrow}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.trim() === "" ? null : plan }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSavedAt(new Date().toLocaleTimeString("ru-RU"));
    } catch (e) {
      setError(`Не удалось сохранить: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-lg font-semibold text-slate-200">
        План на завтра
      </h1>
      <p className="mb-5 text-sm text-slate-500">
        {human} ({tomorrow})
      </p>

      <div className="space-y-6 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <TaskList date={tomorrow} />

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
            План на завтра
          </label>
          {loading ? (
            <div className="text-sm text-slate-500">Загрузка…</div>
          ) : (
            <textarea
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              rows={6}
              placeholder="Главный фокус, заметки, что важно не забыть"
              className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-600"
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={savePlan}
            disabled={saving}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Сохранить план"}
          </button>
          {savedAt && !error && (
            <span className="text-xs text-emerald-400">Сохранено в {savedAt}</span>
          )}
          {error && <span className="text-xs text-rose-400">{error}</span>}
        </div>
      </div>
    </div>
  );
}
