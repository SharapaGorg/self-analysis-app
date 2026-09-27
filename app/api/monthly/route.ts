import { NextResponse } from "next/server";
import { getAllMonthly } from "@/lib/repos/monthly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getAllMonthly());
}
