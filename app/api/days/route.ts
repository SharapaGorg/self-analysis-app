import { NextRequest, NextResponse } from "next/server";
import { getDaysInRange, getAllDays } from "@/lib/repos/days";
import { isValidDate } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (from === null && to === null) {
    return NextResponse.json(getAllDays());
  }
  if (!isValidDate(from) || !isValidDate(to)) {
    return NextResponse.json(
      { error: "from/to must be valid YYYY-MM-DD dates" },
      { status: 400 },
    );
  }
  return NextResponse.json(getDaysInRange(from, to));
}
