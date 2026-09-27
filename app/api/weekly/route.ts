import { NextResponse } from "next/server";
import { getAllWeekly } from "@/lib/repos/weekly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getAllWeekly());
}
