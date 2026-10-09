import { beforeAll, describe, it, expect } from "vitest";
import { useTempDb } from "./helpers/testdb";

let getDb: typeof import("../lib/db").getDb;
beforeAll(async () => {
  useTempDb();
  ({ getDb } = await import("../lib/db"));
});

function cols(table: string): string[] {
  return (
    getDb().prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  ).map((r) => r.name);
}

describe("migrate", () => {
  it("creates tasks table with expected columns", () => {
    expect(cols("tasks").sort()).toEqual(
      [
        "actual",
        "date",
        "done",
        "id",
        "planned",
        "sort_order",
        "title",
        "updated_at",
      ].sort(),
    );
  });

  it("adds new columns to days", () => {
    const c = cols("days");
    for (const col of [
      "mistakes",
      "wins",
      "conclusions",
      "mental",
      "mental_note",
      "social",
    ]) {
      expect(c).toContain(col);
    }
  });

  it("adds 3 review columns to weekly_reviews and monthly_reviews", () => {
    for (const t of ["weekly_reviews", "monthly_reviews"]) {
      for (const col of ["mistakes", "wins", "conclusions"]) {
        expect(cols(t)).toContain(col);
      }
    }
  });

  it("is idempotent — opening does not throw", () => {
    expect(() => getDb().pragma("user_version")).not.toThrow();
  });
});
