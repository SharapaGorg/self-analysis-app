"use client";

import { useMemo } from "react";
import DayEditor from "@/components/DayEditor";
import { toISODate, addDays, parseISODate } from "@/lib/dates";

export default function PlanPage() {
  const tomorrow = useMemo(() => addDays(toISODate(new Date()), 1), []);
  const human = useMemo(
    () =>
      parseISODate(tomorrow).toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [tomorrow],
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-lg font-semibold text-slate-200">
        План на завтра
      </h1>
      <p className="mb-5 text-sm text-slate-500">
        {human} ({tomorrow}) — заведи задачи и запланируй помодоры.
      </p>
      <DayEditor date={tomorrow} />
    </div>
  );
}
