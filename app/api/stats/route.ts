import { NextRequest, NextResponse } from "next/server";
import { getAllDays } from "@/lib/repos/days";
import { getAllWeekly } from "@/lib/repos/weekly";
import { getAllMonthly } from "@/lib/repos/monthly";
import { getSettings } from "@/lib/repos/settings";
import { computeStats } from "@/lib/stats";
import { toISODate } from "@/lib/dates";
import { isValidDate } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_RANGES = new Set([30, 90, 365]);

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const rangeParam = Number(searchParams.get("range"));
  const rangeDays = ALLOWED_RANGES.has(rangeParam) ? rangeParam : 30;

  const todayParam = searchParams.get("today");
  const today = isValidDate(todayParam) ? todayParam : toISODate(new Date());

  const stats = computeStats({
    today,
    rangeDays,
    days: getAllDays(),
    weekly: getAllWeekly(),
    monthly: getAllMonthly(),
    dailyGoal: getSettings().daily_goal,
  });

  return NextResponse.json(stats);
}
