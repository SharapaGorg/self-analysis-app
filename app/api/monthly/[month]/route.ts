import { NextRequest, NextResponse } from "next/server";
import { getMonthly, upsertMonthly, type MonthlyUpsert } from "@/lib/repos/monthly";
import { isValidMonth, parseQuality, parseText } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ month: string }> },
) {
  const { month } = await params;
  if (!isValidMonth(month)) {
    return NextResponse.json({ error: "invalid month" }, { status: 400 });
  }
  const rec = getMonthly(month);
  return NextResponse.json(
    rec ?? { month, quality: null, review: null, plan: null, updated_at: null },
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ month: string }> },
) {
  const { month } = await params;
  if (!isValidMonth(month)) {
    return NextResponse.json({ error: "invalid month" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const patch: MonthlyUpsert = {};
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

  return NextResponse.json(upsertMonthly(month, patch));
}
