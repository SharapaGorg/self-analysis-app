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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSavedAt(null);
    fetch(endpoint)
      .then((r) => r.json())
      .then((d: ReviewData) => {
        if (cancelled) return;
        setQuality(d.quality ?? null);
        setReview(d.review ?? "");
        setPlan(d.plan ?? "");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  async function save() {
    setSaving(true);
    await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quality,
        review: review.trim() === "" ? null : review,
        plan: plan.trim() === "" ? null : plan,
      }),
    });
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString("ru-RU"));
    onSaved?.();
  }

  if (loading) return <div className="text-sm text-slate-500">Загрузка…</div>;

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
        {savedAt && <span className="text-xs text-emerald-400">Сохранено в {savedAt}</span>}
      </div>
    </div>
  );
}
