import { NextRequest, NextResponse } from "next/server";
import { getWeekly, upsertWeekly, type WeeklyUpsert } from "@/lib/repos/weekly";
import { isValidDate, parseQuality, parseText } from "@/lib/validate";
import { mondayOf } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ weekStart: string }> },
) {
  const { weekStart } = await params;
  if (!isValidDate(weekStart)) {
    return NextResponse.json({ error: "invalid weekStart" }, { status: 400 });
  }
  const rec = getWeekly(weekStart);
  return NextResponse.json(
    rec ?? { week_start: weekStart, quality: null, review: null, plan: null, updated_at: null },
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ weekStart: string }> },
) {
  const { weekStart } = await params;
  if (!isValidDate(weekStart) || mondayOf(weekStart) !== weekStart) {
    return NextResponse.json(
      { error: "weekStart must be a Monday (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const patch: WeeklyUpsert = {};
  if ("quality" in body) {
    const q = parseQuality(body.quality);
    if (q === undefined) {
      return NextResponse.json({ error: "quality must be null or 1..10" }, { status: 400 });
    }
    patch.quality = q;
  }
  for (const field of ["review", "plan"] as const) {
    if (field in body) {
      const v = parseText(body[field]);
      if (v === undefined) {
        return NextResponse.json({ error: `${field} must be string or null` }, { status: 400 });
      }
      patch[field] = v;
    }
  }

  return NextResponse.json(upsertWeekly(weekStart, patch));
}
