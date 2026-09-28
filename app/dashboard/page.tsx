"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import type { DashboardStats, PctDelta, PointDelta } from "@/lib/types";

const RANGES = [30, 90, 365];

export default function DashboardPage() {
  const [range, setRange] = useState(30);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [goalInput, setGoalInput] = useState<string>("");

  const load = (r: number) =>
    fetch(`/api/stats?range=${r}`)
      .then((res) => res.json())
      .then((s: DashboardStats) => {
        setStats(s);
        setGoalInput(String(s.dailyGoal));
      });

  useEffect(() => {
    load(range);
  }, [range]);

  async function saveGoal() {
    const goal = Math.floor(Number(goalInput));
    if (!Number.isInteger(goal) || goal < 1 || goal > 100) return;
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily_goal: goal }),
    });
    load(range);
  }

  if (!stats) return <div className="text-sm text-slate-500">Загрузка…</div>;

  const qualitySeries = stats.series.filter((d) => d.quality !== null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Динамика</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>Цель/день:</span>
            <input
              type="number"
              min={1}
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onBlur={saveGoal}
              onKeyDown={(e) => e.key === "Enter" && saveGoal()}
              className="w-16 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-center text-slate-200"
            />
          </div>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={
                  "rounded-md px-3 py-1.5 text-sm transition " +
                  (range === r ? "bg-indigo-500/15 text-indigo-300" : "text-slate-400 hover:bg-slate-800")
                }
              >
                {r} дн
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="Сегодня" value={stats.totals.today} suffix="🍅" />
        <Tile label="За неделю" value={stats.totals.week} suffix="🍅" />
        <Tile label="За месяц" value={stats.totals.month} suffix="🍅" />
        <Tile label="Всего" value={stats.totals.allTime} suffix="🍅" />
        <Tile label="Стрик" value={stats.streak} suffix="🔥" hint={`≥ ${stats.dailyGoal}/день`} />
      </div>

      {/* Average pomodoros per day */}
      <Card title="Среднее помодоров в день">
        <div className="grid grid-cols-3 gap-4">
          <AvgCell label="Последняя неделя" value={stats.avgPerDay.week} />
          <AvgCell label="Последний месяц" value={stats.avgPerDay.month} />
          <AvgCell label="За всё время" value={stats.avgPerDay.allTime} />
        </div>
        <p className="mt-3 text-[11px] text-slate-600">
          Среднее по календарным дням — дни без помодоров считаются как 0.
        </p>
      </Card>

      {/* Pomodoro bar chart with goal line */}
      <Card title={`Помодоры по дням (${range} дн)`}>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={stats.series} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fill: "#64748b", fontSize: 11 }} minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#e2e8f0" }}
            />
            <ReferenceLine y={stats.dailyGoal} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "цель", fill: "#f59e0b", fontSize: 11, position: "right" }} />
            <Bar dataKey="pomodoros" fill="#6366f1" radius={[3, 3, 0, 0]} name="Помодоры" />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Quality trend */}
      <Card title="Тренд качества (оценки дня)">
        {qualitySeries.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-600">Пока нет оценок дня.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.series} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fill: "#64748b", fontSize: 11 }} minTickGap={24} />
              <YAxis domain={[0, 10]} tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Line type="monotone" dataKey="quality" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} connectNulls name="Качество" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Deltas */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card title="Неделя к неделе">
          <DeltaRow label="Помодоры" pct={stats.deltas.weekOverWeek.pomodoros} />
          <PointRow label="Качество недели" point={stats.deltas.weekOverWeek.quality} />
        </Card>
        <Card title="Месяц к месяцу">
          <DeltaRow label="Помодоры" pct={stats.deltas.monthOverMonth.pomodoros} />
          <PointRow label="Качество месяца" point={stats.deltas.monthOverMonth.quality} />
        </Card>
      </div>

      <div className="flex justify-end">
        <a
          href="/api/backup"
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200"
        >
          ⤓ Скачать бэкап БД
        </a>
      </div>
    </div>
  );
}

function Tile({ label, value, suffix, hint }: { label: string; value: number; suffix?: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-100">
        {value} {suffix && <span className="text-base">{suffix}</span>}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-600">{hint}</div>}
    </div>
  );
}

function AvgCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-slate-100">
        {value.toFixed(1)} <span className="text-sm">🍅</span>
      </div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <h2 className="mb-4 text-sm font-medium text-slate-300">{title}</h2>
      {children}
    </div>
  );
}

function DeltaRow({ label, pct }: { label: string; pct: PctDelta }) {
  const up = pct.pct !== null && pct.pct > 0;
  const down = pct.pct !== null && pct.pct < 0;
  const color = up ? "text-emerald-400" : down ? "text-rose-400" : "text-slate-400";
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-slate-300">{pct.previous} → {pct.current}</span>
        <span className={color}>
          {pct.pct === null ? "—" : `${up ? "▲" : down ? "▼" : ""} ${Math.abs(Math.round(pct.pct))}%`}
        </span>
      </span>
    </div>
  );
}

function PointRow({ label, point }: { label: string; point: PointDelta }) {
  const up = point.diff !== null && point.diff > 0;
  const down = point.diff !== null && point.diff < 0;
  const color = up ? "text-emerald-400" : down ? "text-rose-400" : "text-slate-400";
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-slate-300">
          {point.previous ?? "—"} → {point.current ?? "—"}
        </span>
        <span className={color}>
          {point.diff === null ? "—" : `${up ? "▲" : down ? "▼" : ""} ${point.diff > 0 ? "+" : ""}${point.diff}`}
        </span>
      </span>
    </div>
  );
}
