import { NextRequest, NextResponse } from "next/server";
import { getDaysInRange } from "@/lib/repos/days";
import { upsertMonthly } from "@/lib/repos/monthly";
import { summarizeReviews } from "@/lib/llm";
import { isValidMonth } from "@/lib/validate";
import { firstOfMonth, lastOfMonth } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ month: string }> },
) {
  const { month } = await params;
  if (!isValidMonth(month)) {
    return NextResponse.json({ error: "invalid month" }, { status: 400 });
  }
  const days = getDaysInRange(firstOfMonth(month), lastOfMonth(month));
  try {
    const summary = await summarizeReviews(
      days.map((d) => ({
        date: d.date,
        mistakes: d.mistakes,
        wins: d.wins,
        conclusions: d.conclusions,
      })),
    );
    return NextResponse.json(upsertMonthly(month, summary));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
