import { beforeAll, describe, it, expect } from "vitest";
import { useTempDb } from "./helpers/testdb";

let days: typeof import("../lib/repos/days");
beforeAll(async () => {
  useTempDb();
  days = await import("../lib/repos/days");
});

describe("upsertDay new fields", () => {
  it("persists mistakes/wins/conclusions/mental/mental_note/social", () => {
    const rec = days.upsertDay("2026-10-01", {
      mistakes: "m",
      wins: "w",
      conclusions: "c",
      mental: 7,
      mental_note: "ok",
      social: 1,
    });
    expect(rec.mistakes).toBe("m");
    expect(rec.wins).toBe("w");
    expect(rec.conclusions).toBe("c");
    expect(rec.mental).toBe(7);
    expect(rec.mental_note).toBe("ok");
    expect(rec.social).toBe(1);
  });

  it("defaults social to 0 and leaves new fields null", () => {
    const rec = days.upsertDay("2026-10-02", { quality: 5 });
    expect(rec.social).toBe(0);
    expect(rec.mistakes).toBeNull();
    expect(rec.mental).toBeNull();
  });

  it("partial update does not clobber existing fields", () => {
    days.upsertDay("2026-10-03", { mistakes: "keep", social: 1 });
    const rec = days.upsertDay("2026-10-03", { wins: "added" });
    expect(rec.mistakes).toBe("keep");
    expect(rec.wins).toBe("added");
    expect(rec.social).toBe(1);
  });
});
