"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  toISODate,
  mondayOf,
  monthOf,
  previousMonth,
  isSunday,
  isFirstOfMonth,
} from "@/lib/dates";

interface Reminder {
  text: string;
  href: string;
}

async function fetchJson(url: string) {
  const res = await fetch(url);
  return res.json();
}

function empty(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

export default function ReminderBanner() {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    const today = toISODate(new Date());
    const tasks: Promise<Reminder | null>[] = [];

    // Daily review — every day.
    tasks.push(
      fetchJson(`/api/days/${today}`).then((d) =>
        empty(d.review)
          ? { text: "Ревью дня за сегодня не заполнено", href: "/reviews?tab=day" }
          : null,
      ),
    );

    // Weekly review — on Sundays.
    if (isSunday(today)) {
      const ws = mondayOf(today);
      tasks.push(
        fetchJson(`/api/weekly/${ws}`).then((w) =>
          empty(w.review) && empty(w.plan)
            ? { text: "Воскресенье — пора сделать ревью недели и план на следующую", href: "/reviews?tab=week" }
            : null,
        ),
      );
    }

    // Monthly review — on the 1st (reviewing the month that just ended).
    if (isFirstOfMonth(today)) {
      const prev = previousMonth(monthOf(today));
      tasks.push(
        fetchJson(`/api/monthly/${prev}`).then((m) =>
          empty(m.review) && empty(m.plan)
            ? { text: "1-е число — ревью прошлого месяца и план на новый", href: "/reviews?tab=month" }
            : null,
        ),
      );
    }

    Promise.all(tasks).then((rs) =>
      setReminders(rs.filter((r): r is Reminder => r !== null)),
    );
  }, []);

  if (reminders.length === 0) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4">
      <div className="space-y-2">
        {reminders.map((r, i) => (
          <Link
            key={i}
            href={r.href}
            className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200 transition-colors hover:bg-amber-500/20"
          >
            <span aria-hidden>⏰</span>
            <span>{r.text}</span>
            <span className="ml-auto text-amber-300/70" aria-hidden>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
