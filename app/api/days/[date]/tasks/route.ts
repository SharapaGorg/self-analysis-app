import { NextRequest, NextResponse } from "next/server";
import { listTasks, createTask } from "@/lib/repos/tasks";
import { isValidDate, parseTitle, parsePomodoros } from "@/lib/validate";

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
  return NextResponse.json(listTasks(date));
}

export async function POST(
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

  const title = parseTitle(body.title);
  if (title === undefined) {
    return NextResponse.json(
      { error: "title must be a non-empty string" },
      { status: 400 },
    );
  }
  const planned = "planned" in body ? parsePomodoros(body.planned) : 0;
  if (planned === undefined) {
    return NextResponse.json(
      { error: "planned must be an integer >= 0" },
      { status: 400 },
    );
  }

  return NextResponse.json(createTask(date, title, planned));
}
