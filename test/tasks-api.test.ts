import { beforeAll, describe, it, expect } from "vitest";
import { useTempDb } from "./helpers/testdb";

type Ctx<T> = { params: Promise<T> };

let tasksRoute: typeof import("../app/api/days/[date]/tasks/route");
let taskIdRoute: typeof import("../app/api/tasks/[id]/route");
let dayRoute: typeof import("../app/api/days/[date]/route");

beforeAll(async () => {
  useTempDb();
  tasksRoute = await import("../app/api/days/[date]/tasks/route");
  taskIdRoute = await import("../app/api/tasks/[id]/route");
  dayRoute = await import("../app/api/days/[date]/route");
});

function postReq(body: unknown) {
  return new Request("http://x", {
    method: "POST",
    body: JSON.stringify(body),
  }) as never;
}
function putReq(body: unknown) {
  return new Request("http://x", {
    method: "PUT",
    body: JSON.stringify(body),
  }) as never;
}
function ctx<T>(params: T): Ctx<T> {
  return { params: Promise.resolve(params) };
}

describe("POST /api/days/[date]/tasks", () => {
  it("rejects empty title with 400", async () => {
    const res = await tasksRoute.POST(
      postReq({ title: "  ", planned: 1 }),
      ctx({ date: "2026-12-01" }),
    );
    expect(res.status).toBe(400);
  });

  it("creates a task and returns it", async () => {
    const res = await tasksRoute.POST(
      postReq({ title: "task", planned: 2 }),
      ctx({ date: "2026-12-01" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.title).toBe("task");
    expect(json.planned).toBe(2);
  });

  it("lists tasks via GET", async () => {
    const res = await tasksRoute.GET(
      new Request("http://x") as never,
      ctx({ date: "2026-12-01" }),
    );
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(1);
  });
});

describe("PUT/DELETE /api/tasks/[id]", () => {
  it("updates actual and done", async () => {
    const created = await (
      await tasksRoute.POST(
        postReq({ title: "u", planned: 3 }),
        ctx({ date: "2026-12-02" }),
      )
    ).json();
    const res = await taskIdRoute.PUT(
      putReq({ actual: 5, done: true }),
      ctx({ id: String(created.id) }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.actual).toBe(5);
    expect(json.done).toBe(1);
  });
});

describe("PUT /api/days/[date] ignores pomodoros when tasks exist", () => {
  it("keeps the task-derived sum, not the body value", async () => {
    const created = await (
      await tasksRoute.POST(
        postReq({ title: "t", planned: 2 }),
        ctx({ date: "2026-12-03" }),
      )
    ).json();
    await taskIdRoute.PUT(putReq({ actual: 4 }), ctx({ id: String(created.id) }));

    const res = await dayRoute.PUT(
      putReq({ pomodoros: 99, mistakes: "m" }),
      ctx({ date: "2026-12-03" }),
    );
    const json = await res.json();
    expect(json.pomodoros).toBe(4); // body's 99 ignored
    expect(json.mistakes).toBe("m");
  });
});
