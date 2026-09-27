import { NextRequest, NextResponse } from "next/server";
import { getDay, upsertDay, type DayUpsert } from "@/lib/repos/days";
import { isValidDate, parsePomodoros, parseQuality, parseText } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }
  const rec = getDay(date);
  return NextResponse.json(
    rec ?? { date, pomodoros: 0, quality: null, review: null, updated_at: null },
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const patch: DayUpsert = {};

  if ("pomodoros" in body) {
    const p = parsePomodoros(body.pomodoros);
    if (p === undefined) {
      return NextResponse.json(
        { error: "pomodoros must be an integer >= 0" },
        { status: 400 },
      );
    }
    patch.pomodoros = p;
  }
  if ("quality" in body) {
    const q = parseQuality(body.quality);
    if (q === undefined) {
      return NextResponse.json(
        { error: "quality must be null or an integer 1..10" },
        { status: 400 },
      );
    }
    patch.quality = q;
  }
  if ("review" in body) {
    const r = parseText(body.review);
    if (r === undefined) {
      return NextResponse.json(
        { error: "review must be a string or null" },
        { status: 400 },
      );
    }
    patch.review = r;
  }

  return NextResponse.json(upsertDay(date, patch));
}
