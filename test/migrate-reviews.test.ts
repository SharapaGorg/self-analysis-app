import { beforeAll, describe, it, expect, vi } from "vitest";
import { useTempDb } from "./helpers/testdb";

let days: typeof import("../lib/repos/days");
let migrateReviews: typeof import("../scripts/migrate-reviews").migrateReviews;

beforeAll(async () => {
  useTempDb();
  days = await import("../lib/repos/days");
  ({ migrateReviews } = await import("../scripts/migrate-reviews"));
});

describe("migrateReviews", () => {
  it("migrates only days with legacy review and empty 3-field review; idempotent", async () => {
    // Day A: legacy review, not yet split.
    days.upsertDay("2026-09-07", { review: "сделал X, ошибся в Y" });
    // Day B: already has a 3-field review — must be skipped.
    days.upsertDay("2026-09-08", {
      review: "old text",
      mistakes: "уже разложено",
    });
    // Day C: no review at all — skipped.
    days.upsertDay("2026-09-09", { quality: 5 });

    const split = vi.fn(async (_text: string) => ({
      mistakes: "ошибка Y",
      wins: "сделал X",
      conclusions: "вывод",
    }));

    const first = await migrateReviews(split);
    expect(first.migrated).toBe(1);
    expect(split).toHaveBeenCalledTimes(1);

    const a = days.getDay("2026-09-07")!;
    expect(a.mistakes).toBe("ошибка Y");
    expect(a.wins).toBe("сделал X");
    expect(a.conclusions).toBe("вывод");
    // Legacy review is retained as an archive.
    expect(a.review).toBe("сделал X, ошибся в Y");

    // Second run migrates nothing (now all have 3-field content).
    const second = await migrateReviews(split);
    expect(second.migrated).toBe(0);
    expect(split).toHaveBeenCalledTimes(1);
  });
});
