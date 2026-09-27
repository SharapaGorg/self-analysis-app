import { NextRequest, NextResponse } from "next/server";
import { getSettings, setDailyGoal } from "@/lib/repos/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getSettings());
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const goal = body?.daily_goal;
  if (typeof goal !== "number" || !Number.isInteger(goal) || goal < 1 || goal > 100) {
    return NextResponse.json(
      { error: "daily_goal must be an integer 1..100" },
      { status: 400 },
    );
  }
  return NextResponse.json(setDailyGoal(goal));
}
