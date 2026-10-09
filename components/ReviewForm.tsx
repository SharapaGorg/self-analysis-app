"use client";

import { useEffect, useState } from "react";
import QualityPicker from "./QualityPicker";

interface ReviewData {
  quality: number | null;
  plan: string | null;
  mistakes: string | null;
  wins: string | null;
  conclusions: string | null;
}

export default function ReviewForm({
  endpoint,
  summaryEndpoint,
  planLabel,
  planPlaceholder,
  onSaved,
}: {
  endpoint: string; // e.g. /api/weekly/2026-09-21
  summaryEndpoint: string; // e.g. /api/weekly/2026-09-21/summary
  planLabel: string;
  planPlaceholder?: string;
  onSaved?: () => void;
}) {
  const [quality, setQuality] = useState<number | null>(null);
  const [plan, setPlan] = useState("");
  const [mistakes, setMistakes] = useState<string | null>(null);
  const [wins, setWins] = useState<string | null>(null);
  const [conclusions, setConclusions] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSavedAt(null);
    setError(null);
    fetch(endpoint)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: ReviewData) => {
        if (cancelled) return;
        setQuality(d.quality ?? null);
        setPlan(d.plan ?? "");
        setMistakes(d.mistakes ?? null);
        setWins(d.wins ?? null);
        setConclusions(d.conclusions ?? null);
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
  }, [endpoint]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quality,
          plan: plan.trim() === "" ? null : plan,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSavedAt(new Date().toLocaleTimeString("ru-RU"));
      onSaved?.();
    } catch (e) {
      setError(`Не удалось сохранить: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(summaryEndpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setMistakes(data.mistakes ?? null);
      setWins(data.wins ?? null);
      setConclusions(data.conclusions ?? null);
      onSaved?.();
    } catch (e) {
      setError(`Не удалось сгенерировать сводку: ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Загрузка…</div>;

  const label =
    "mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400";

  return (
    <div className="space-y-5">
      <div>
        <label className={label}>Оценка качества</label>
        <QualityPicker value={quality} onChange={setQuality} />
      </div>

      <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Авто-сводка по дням
          </span>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {generating ? "Генерация…" : "Сгенерировать сводку"}
          </button>
        </div>
        <SummaryField title="Ошибки" value={mistakes} />
        <SummaryField title="Победы" value={wins} />
        <SummaryField title="Выводы" value={conclusions} />
      </div>

      <div>
        <label className={label}>{planLabel}</label>
        <textarea
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          rows={6}
          placeholder={planPlaceholder}
          className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-600"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
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

function SummaryField({ title, value }: { title: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-300">{title}</div>
      {value ? (
        <p className="whitespace-pre-wrap text-sm text-slate-400">{value}</p>
      ) : (
        <p className="text-sm text-slate-600">— (нажми «Сгенерировать сводку»)</p>
      )}
    </div>
  );
}
