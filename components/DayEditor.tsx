"use client";

import { useEffect, useState } from "react";
import QualityPicker from "./QualityPicker";
import type { DayRecord } from "@/lib/types";

export default function DayEditor({
  date,
  onSaved,
}: {
  date: string;
  onSaved?: (rec: DayRecord) => void;
}) {
  const [pomodoros, setPomodoros] = useState(0);
  const [quality, setQuality] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSavedAt(null);
    setError(null);
    fetch(`/api/days/${date}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: DayRecord) => {
        if (cancelled) return;
        setPomodoros(d.pomodoros ?? 0);
        setQuality(d.quality ?? null);
        setReview(d.review ?? "");
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(`Не удалось загрузить день: ${e.message}`);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/days/${date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pomodoros,
          quality,
          review: review.trim() === "" ? null : review,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rec = (await res.json()) as DayRecord;
      setSavedAt(new Date().toLocaleTimeString("ru-RU"));
      onSaved?.(rec);
    } catch (e) {
      setError(`Не удалось сохранить: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500">Загрузка…</div>;
  }

  if (error && review === "" && quality === null) {
    return (
      <div className="text-sm text-rose-400">
        {error}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="ml-2 underline hover:text-rose-300"
        >
          Обновить
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
          Помодоры
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPomodoros((p) => Math.max(0, p - 1))}
            className="h-9 w-9 rounded-lg bg-slate-800 text-lg text-slate-200 hover:bg-slate-700"
          >
            −
          </button>
          <input
            type="number"
            min={0}
            value={pomodoros}
            onChange={(e) => setPomodoros(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-center text-lg font-semibold"
          />
          <button
            type="button"
            onClick={() => setPomodoros((p) => p + 1)}
            className="h-9 w-9 rounded-lg bg-slate-800 text-lg text-slate-200 hover:bg-slate-700"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
          Качество дня
        </label>
        <QualityPicker value={quality} onChange={setQuality} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
          Ревью дня
        </label>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={5}
          placeholder="Как прошёл день? Что получилось, что мешало?"
          className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-600"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
        {savedAt && !error && (
          <span className="text-xs text-emerald-400">Сохранено в {savedAt}</span>
        )}
        {error && <span className="text-xs text-rose-400">{error}</span>}
      </div>
    </div>
  );
}
