"use client";

import { useEffect, useMemo, useState } from "react";
import DayEditor from "@/components/DayEditor";
import ReviewForm from "@/components/ReviewForm";
import {
  toISODate,
  mondayOf,
  sundayOf,
  monthOf,
  addDays,
  previousMonth,
  parseISODate,
  pad2,
} from "@/lib/dates";
import type { WeeklyReview, MonthlyReview } from "@/lib/types";

type Tab = "day" | "week" | "month";
const MONTH_NAMES = [
  "янв", "фев", "мар", "апр", "май", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];
const MONTH_FULL = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function fmtDay(s: string): string {
  const d = parseISODate(s);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}
function weekLabel(ws: string): string {
  return `${fmtDay(ws)} – ${fmtDay(sundayOf(ws))} ${parseISODate(ws).getFullYear()}`;
}
function nextMonthKey(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_FULL[m - 1]} ${y}`;
}

export default function ReviewsPage() {
  const today = useMemo(() => toISODate(new Date()), []);
  const [tab, setTab] = useState<Tab>("day");

  const [dayDate, setDayDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => mondayOf(today));
  const [month, setMonth] = useState(() => monthOf(today));

  const [pastWeeks, setPastWeeks] = useState<WeeklyReview[]>([]);
  const [pastMonths, setPastMonths] = useState<MonthlyReview[]>([]);

  // Honor ?tab= from reminder-banner links (read client-side to avoid Suspense).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "day" || t === "week" || t === "month") setTab(t);
  }, []);

  const loadWeeks = () =>
    fetch("/api/weekly").then((r) => r.json()).then(setPastWeeks);
  const loadMonths = () =>
    fetch("/api/monthly").then((r) => r.json()).then(setPastMonths);

  useEffect(() => {
    loadWeeks();
    loadMonths();
  }, []);

  return (
    <div>
      <div className="mb-6 flex gap-1">
        {(["day", "week", "month"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "rounded-lg px-4 py-2 text-sm font-medium transition " +
              (tab === t
                ? "bg-indigo-500/15 text-indigo-300"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")
            }
          >
            {t === "day" ? "День" : t === "week" ? "Неделя" : "Месяц"}
          </button>
        ))}
      </div>

      {tab === "day" && (
        <div className="max-w-xl rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <button onClick={() => setDayDate(addDays(dayDate, -1))} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">←</button>
            <input
              type="date"
              value={dayDate}
              onChange={(e) => e.target.value && setDayDate(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
            />
            <button onClick={() => setDayDate(addDays(dayDate, 1))} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">→</button>
            <button onClick={() => setDayDate(today)} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">Сегодня</button>
          </div>
          <DayEditor date={dayDate} />
        </div>
      )}

      {tab === "week" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">←</button>
              <span className="text-sm font-semibold">{weekLabel(weekStart)}</span>
              <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">→</button>
              <button onClick={() => setWeekStart(mondayOf(today))} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">Текущая</button>
            </div>
            <ReviewForm
              key={weekStart}
              endpoint={`/api/weekly/${weekStart}`}
              reviewLabel="Как прошла неделя"
              planLabel="Планы на следующую неделю"
              reviewPlaceholder="Что удалось, где просел, какие выводы?"
              planPlaceholder="Главные задачи и фокус на следующую неделю"
              onSaved={loadWeeks}
            />
          </div>
          <PastList
            title="Прошлые недели"
            items={pastWeeks.map((w) => ({ key: w.week_start, label: weekLabel(w.week_start), quality: w.quality, has: !!(w.review || w.plan) }))}
            activeKey={weekStart}
            onPick={setWeekStart}
          />
        </div>
      )}

      {tab === "month" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <button onClick={() => setMonth(previousMonth(month))} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">←</button>
              <span className="text-sm font-semibold">{monthLabel(month)}</span>
              <button onClick={() => setMonth(nextMonthKey(month))} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">→</button>
              <button onClick={() => setMonth(monthOf(today))} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm hover:bg-slate-700">Текущий</button>
            </div>
            <ReviewForm
              key={month}
              endpoint={`/api/monthly/${month}`}
              reviewLabel="Итоги месяца"
              planLabel="Планы на следующий месяц"
              reviewPlaceholder="Главные результаты, паттерны, что менять?"
              planPlaceholder="Цели и фокус на следующий месяц"
              onSaved={loadMonths}
            />
          </div>
          <PastList
            title="Прошлые месяцы"
            items={pastMonths.map((m) => ({ key: m.month, label: monthLabel(m.month), quality: m.quality, has: !!(m.review || m.plan) }))}
            activeKey={month}
            onPick={setMonth}
          />
        </div>
      )}
    </div>
  );
}

function PastList({
  title,
  items,
  activeKey,
  onPick,
}: {
  title: string;
  items: { key: string; label: string; quality: number | null; has: boolean }[];
  activeKey: string;
  onPick: (key: string) => void;
}) {
  return (
    <aside>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-600">Пока пусто.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it.key}>
              <button
                onClick={() => onPick(it.key)}
                className={
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition " +
                  (it.key === activeKey
                    ? "border-indigo-400/50 bg-indigo-500/10"
                    : "border-slate-800 hover:border-slate-600")
                }
              >
                <span className="text-slate-300">{it.label}</span>
                {it.quality !== null && (
                  <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">{it.quality}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
