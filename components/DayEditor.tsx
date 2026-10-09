"use client";

import { useEffect, useState } from "react";
import QualityPicker from "./QualityPicker";
import TaskList from "./TaskList";
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
  const [mental, setMental] = useState<number | null>(null);
  const [mentalNote, setMentalNote] = useState("");
  const [mistakes, setMistakes] = useState("");
  const [wins, setWins] = useState("");
  const [conclusions, setConclusions] = useState("");
  const [social, setSocial] = useState<0 | 1>(0);
  const [hasTasks, setHasTasks] = useState(false);
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
        setMental(d.mental ?? null);
        setMentalNote(d.mental_note ?? "");
        setMistakes(d.mistakes ?? "");
        setWins(d.wins ?? "");
        setConclusions(d.conclusions ?? "");
        setSocial(d.social === 1 ? 1 : 0);
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
      const body: Record<string, unknown> = {
        quality,
        mental,
        mental_note: mentalNote.trim() === "" ? null : mentalNote,
        mistakes: mistakes.trim() === "" ? null : mistakes,
        wins: wins.trim() === "" ? null : wins,
        conclusions: conclusions.trim() === "" ? null : conclusions,
        social,
      };
      // Manual pomodoros only matters for days without tasks; for days with
      // tasks the server derives the total and ignores this anyway.
      if (!hasTasks) body.pomodoros = pomodoros;

      const res = await fetch(`/api/days/${date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rec = (await res.json()) as DayRecord;
      setPomodoros(rec.pomodoros ?? 0);
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

  if (error && mistakes === "" && quality === null && !hasTasks) {
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

  const fieldLabel =
    "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400";
  const textareaCls =
    "w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-600";

  return (
    <div className="space-y-5">
      <TaskList date={date} onHasTasksChange={setHasTasks} />

      {!hasTasks && (
        <div>
          <label className={fieldLabel}>Помодоры (без задач)</label>
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
              step={0.5}
              value={pomodoros}
              onChange={(e) =>
                setPomodoros(Math.max(0, Number(e.target.value) || 0))
              }
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
      )}

      <div>
        <label className={fieldLabel}>Качество дня</label>
        <QualityPicker value={quality} onChange={setQuality} />
      </div>

      <div>
        <label className={fieldLabel}>Менталка</label>
        <QualityPicker value={mental} onChange={setMental} />
        <textarea
          value={mentalNote}
          onChange={(e) => setMentalNote(e.target.value)}
          rows={2}
          placeholder="Как ментальное состояние?"
          className={textareaCls + " mt-2"}
        />
      </div>

      <div>
        <label className={fieldLabel}>Ошибки</label>
        <textarea
          value={mistakes}
          onChange={(e) => setMistakes(e.target.value)}
          rows={3}
          placeholder="Что пошло не так?"
          className={textareaCls}
        />
      </div>
      <div>
        <label className={fieldLabel}>Победы</label>
        <textarea
          value={wins}
          onChange={(e) => setWins(e.target.value)}
          rows={3}
          placeholder="Что получилось?"
          className={textareaCls}
        />
      </div>
      <div>
        <label className={fieldLabel}>Выводы</label>
        <textarea
          value={conclusions}
          onChange={(e) => setConclusions(e.target.value)}
          rows={3}
          placeholder="Какие выводы?"
          className={textareaCls}
        />
      </div>

      <div>
        <label className={fieldLabel}>Социальное</label>
        <button
          type="button"
          onClick={() => setSocial((s) => (s === 1 ? 0 : 1))}
          className={
            "rounded-lg px-4 py-2 text-sm font-medium transition " +
            (social === 1
              ? "bg-emerald-600 text-white hover:bg-emerald-500"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700")
          }
          aria-pressed={social === 1}
        >
          {social === 1 ? "Гулял с кем-то" : "Totally alone full day"}
        </button>
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
