import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { DB_PATH, getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Download the raw SQLite file as a backup. We checkpoint the WAL first so the
// main .db file contains all committed data.
export function GET() {
  getDb().pragma("wal_checkpoint(TRUNCATE)");

  if (!existsSync(DB_PATH)) {
    return NextResponse.json({ error: "database file not found" }, { status: 404 });
  }
  const buf = readFileSync(DB_PATH);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="self-analysis-${stamp}.db"`,
    },
  });
}
