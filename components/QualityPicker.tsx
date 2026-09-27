"use client";

import { qualityColor } from "@/lib/quality";

export default function QualityPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(active ? null : n)}
            className={
              "h-8 w-8 rounded-md text-sm font-semibold transition " +
              (active ? "scale-110 ring-2 ring-white/80" : "opacity-70 hover:opacity-100")
            }
            style={{ backgroundColor: qualityColor(n), color: "#f8fafc" }}
            aria-pressed={active}
            title={`Оценка ${n}`}
          >
            {n}
          </button>
        );
      })}
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-1 rounded-md px-2 py-1 text-xs text-slate-400 hover:text-slate-200"
        >
          сброс
        </button>
      )}
    </div>
  );
}
