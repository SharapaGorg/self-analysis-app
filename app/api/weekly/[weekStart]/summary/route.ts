import { NextRequest, NextResponse } from "next/server";
import { getDaysInRange } from "@/lib/repos/days";
import { upsertWeekly } from "@/lib/repos/weekly";
import { summarizeReviews } from "@/lib/llm";
import { isValidDate } from "@/lib/validate";
import { sundayOf } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ weekStart: string }> },
) {
  const { weekStart } = await params;
  if (!isValidDate(weekStart)) {
    return NextResponse.json({ error: "invalid week start" }, { status: 400 });
  }
  const days = getDaysInRange(weekStart, sundayOf(weekStart));
  try {
    const summary = await summarizeReviews(
      days.map((d) => ({
        date: d.date,
        mistakes: d.mistakes,
        wins: d.wins,
        conclusions: d.conclusions,
      })),
    );
    return NextResponse.json(upsertWeekly(weekStart, summary));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
