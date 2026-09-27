"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DayEditor from "@/components/DayEditor";
import { qualityColor, qualityTextColor } from "@/lib/quality";
import type { DayRecord } from "@/lib/types";
import {
  toISODate,
  monthOf,
  firstOfMonth,
  lastOfMonth,
  parseISODate,
  previousMonth,
  pad2,
} from "@/lib/dates";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function monthTitle(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export default function CalendarPage() {
  const today = useMemo(() => toISODate(new Date()), []);
  const [month, setMonth] = useState(() => monthOf(toISODate(new Date())));
  const [records, setRecords] = useState<Map<string, DayRecord>>(new Map());
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(() => {
    const from = firstOfMonth(month);
    const to = lastOfMonth(month);
    fetch(`/api/days?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((rows: DayRecord[]) => {
        setRecords(new Map(rows.map((r) => [r.date, r])));
      });
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const first = firstOfMonth(month);
  const daysCount = Number(lastOfMonth(month).slice(-2));
  const leading = (parseISODate(first).getDay() + 6) % 7; // Monday-based offset

  const cells: (string | null)[] = [
    ...Array(leading).fill(null),
    ...Array.from({ length: daysCount }, (_, i) => `${month}-${pad2(i + 1)}`),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">{monthTitle(month)}</h1>
          <div className="flex gap-1">
            <button
              onClick={() => setMonth(previousMonth(month))}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
            >
              ←
            </button>
            <button
              onClick={() => setMonth(monthOf(today))}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
            >
              Сегодня
            </button>
            <button
              onClick={() => setMonth(nextMonth(month))}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700"
            >
              →
            </button>
          </div>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1.5 text-center text-xs text-slate-500">
          {WEEKDAYS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((date, i) => {
            if (date === null) return <div key={`b${i}`} />;
            const rec = records.get(date);
            const q = rec?.quality ?? null;
            const pomo = rec?.pomodoros ?? 0;
            const isToday = date === today;
            const isSelected = date === selected;
            const dayNum = Number(date.slice(-2));
            return (
              <button
                key={date}
                onClick={() => setSelected(date)}
                className={
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-center transition " +
                  (isSelected
                    ? "border-indigo-400"
                    : isToday
                      ? "border-slate-500"
                      : "border-slate-800 hover:border-slate-600")
                }
                style={{ backgroundColor: qualityColor(q) }}
              >
                <span
                  className="absolute left-1.5 top-1 text-[10px]"
                  style={{ color: qualityTextColor(q) }}
                >
                  {dayNum}
                </span>
                {pomo > 0 && (
                  <span
                    className="text-lg font-bold leading-none"
                    style={{ color: qualityTextColor(q) }}
                  >
                    {pomo}
                  </span>
                )}
                {rec?.review && (
                  <span className="absolute bottom-1 right-1.5 text-[10px] opacity-80" title="есть ревью">
                    📝
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Цвет ячейки — оценка качества (красный → зелёный), число — количество помодоров.
        </p>
      </section>

      <aside className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        {selected ? (
          <>
            <h2 className="mb-4 text-sm font-semibold text-slate-300">{selected}</h2>
            <DayEditor date={selected} onSaved={load} />
          </>
        ) : (
          <p className="text-sm text-slate-500">Выбери день, чтобы внести помодоры и ревью.</p>
        )}
      </aside>
    </div>
  );
}
