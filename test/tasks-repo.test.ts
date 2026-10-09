import { beforeAll, describe, it, expect } from "vitest";
import { useTempDb } from "./helpers/testdb";

let tasks: typeof import("../lib/repos/tasks");
let days: typeof import("../lib/repos/days");
beforeAll(async () => {
  useTempDb();
  tasks = await import("../lib/repos/tasks");
  days = await import("../lib/repos/days");
});

describe("tasks repo", () => {
  it("creates tasks and recomputes day pomodoros from actual", () => {
    const a = tasks.createTask("2026-11-01", "A", 3);
    const b = tasks.createTask("2026-11-01", "B", 2);
    tasks.updateTask(a.id, { actual: 4 });
    tasks.updateTask(b.id, { actual: 1 });
    expect(days.getDay("2026-11-01")!.pomodoros).toBe(5);
    const list = tasks.listTasks("2026-11-01");
    expect(list.map((t) => t.title)).toEqual(["A", "B"]);
  });

  it("delete recomputes; last delete leaves pomodoros 0", () => {
    const t = tasks.createTask("2026-11-02", "only", 1);
    tasks.updateTask(t.id, { actual: 3 });
    expect(days.getDay("2026-11-02")!.pomodoros).toBe(3);
    tasks.deleteTask(t.id);
    expect(days.getDay("2026-11-02")!.pomodoros).toBe(0);
    expect(tasks.listTasks("2026-11-02")).toEqual([]);
  });

  it("toggles done", () => {
    const t = tasks.createTask("2026-11-03", "x", 1);
    expect(tasks.updateTask(t.id, { done: 1 }).done).toBe(1);
  });

  it("assigns incremental sort_order within a day", () => {
    tasks.createTask("2026-11-04", "first", 1);
    tasks.createTask("2026-11-04", "second", 1);
    const list = tasks.listTasks("2026-11-04");
    expect(list[0].sort_order).toBeLessThan(list[1].sort_order);
  });
});
