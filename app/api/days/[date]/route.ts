import { NextRequest, NextResponse } from "next/server";
import { getDay, upsertDay, type DayUpsert } from "@/lib/repos/days";
import { listTasks } from "@/lib/repos/tasks";
import {
  isValidDate,
  parsePomodoros,
  parseQuality,
  parseText,
  parseBool,
} from "@/lib/validate";

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
    rec ?? {
      date,
      pomodoros: 0,
      quality: null,
      review: null,
      mistakes: null,
      wins: null,
      conclusions: null,
      mental: null,
      mental_note: null,
      social: 0,
      updated_at: null,
    },
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

  // Days that have tasks derive their total from task actuals; a pomodoros
  // value in the body is ignored for them.
  const hasTasks = listTasks(date).length > 0;
  if ("pomodoros" in body && !hasTasks) {
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
  if ("mental" in body) {
    const m = parseQuality(body.mental);
    if (m === undefined) {
      return NextResponse.json(
        { error: "mental must be null or an integer 1..10" },
        { status: 400 },
      );
    }
    patch.mental = m;
  }
  if ("social" in body) {
    const s = parseBool(body.social);
    if (s === undefined) {
      return NextResponse.json(
        { error: "social must be 0 or 1" },
        { status: 400 },
      );
    }
    patch.social = s;
  }

  // Free-text fields share the same null-or-string validation.
  for (const key of [
    "review",
    "mistakes",
    "wins",
    "conclusions",
    "mental_note",
  ] as const) {
    if (key in body) {
      const v = parseText(body[key]);
      if (v === undefined) {
        return NextResponse.json(
          { error: `${key} must be a string or null` },
          { status: 400 },
        );
      }
      patch[key] = v;
    }
  }

  return NextResponse.json(upsertDay(date, patch));
}
