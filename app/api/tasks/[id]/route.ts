import { NextRequest, NextResponse } from "next/server";
import {
  getTask,
  updateTask,
  deleteTask,
  type TaskPatch,
} from "@/lib/repos/tasks";
import { parseTitle, parsePomodoros, parseBool } from "@/lib/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (id === null) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  if (!getTask(id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const patch: TaskPatch = {};
  if ("title" in body) {
    const t = parseTitle(body.title);
    if (t === undefined) {
      return NextResponse.json({ error: "invalid title" }, { status: 400 });
    }
    patch.title = t;
  }
  if ("planned" in body) {
    const p = parsePomodoros(body.planned);
    if (p === undefined) {
      return NextResponse.json({ error: "invalid planned" }, { status: 400 });
    }
    patch.planned = p;
  }
  if ("actual" in body) {
    const a = parsePomodoros(body.actual);
    if (a === undefined) {
      return NextResponse.json({ error: "invalid actual" }, { status: 400 });
    }
    patch.actual = a;
  }
  if ("done" in body) {
    const d = parseBool(body.done);
    if (d === undefined) {
      return NextResponse.json({ error: "invalid done" }, { status: 400 });
    }
    patch.done = d;
  }
  if ("sort_order" in body) {
    const s = parsePomodoros(body.sort_order);
    if (s === undefined) {
      return NextResponse.json(
        { error: "invalid sort_order" },
        { status: 400 },
      );
    }
    patch.sort_order = s;
  }

  return NextResponse.json(updateTask(id, patch));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await params;
  const id = parseId(raw);
  if (id === null) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  deleteTask(id);
  return NextResponse.json({ ok: true });
}
