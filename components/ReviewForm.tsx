"use client";

import { useEffect, useState } from "react";
import QualityPicker from "./QualityPicker";

interface ReviewData {
  quality: number | null;
  review: string | null;
  plan: string | null;
}

export default function ReviewForm({
  endpoint,
  reviewLabel,
  planLabel,
  reviewPlaceholder,
  planPlaceholder,
  onSaved,
}: {
  endpoint: string; // e.g. /api/weekly/2026-09-21
  reviewLabel: string;
  planLabel: string;
  reviewPlaceholder?: string;
  planPlaceholder?: string;
  onSaved?: () => void;
}) {
  const [quality, setQuality] = useState<number | null>(null);
  const [review, setReview] = useState("");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        setReview(d.review ?? "");
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
          review: review.trim() === "" ? null : review,
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

  if (loading) return <div className="text-sm text-slate-500">Загрузка…</div>;

  if (error && review === "" && plan === "" && quality === null) {
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
          Оценка качества
        </label>
        <QualityPicker value={quality} onChange={setQuality} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
          {reviewLabel}
        </label>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={6}
          placeholder={reviewPlaceholder}
          className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-600"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
          {planLabel}
        </label>
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
