import { describe, it, expect, vi } from "vitest";
import { splitReview, summarizeReviews } from "../lib/llm";

describe("splitReview", () => {
  it("parses a JSON model result into three fields", async () => {
    const call = vi.fn(async () =>
      JSON.stringify({ mistakes: "m", wins: "w", conclusions: "c" }),
    );
    const out = await splitReview("some day text", call);
    expect(out).toEqual({ mistakes: "m", wins: "w", conclusions: "c" });
    expect(call).toHaveBeenCalledOnce();
    // Prompt should include the source text.
    expect(call.mock.calls[0][0]).toContain("some day text");
  });

  it("falls back to conclusions when the model returns invalid JSON", async () => {
    const call = vi.fn(async () => "not json at all");
    const out = await splitReview("raw text", call);
    expect(out).toEqual({ mistakes: "", wins: "", conclusions: "raw text" });
  });
});

describe("summarizeReviews", () => {
  it("builds a prompt from days and parses the summary", async () => {
    const call = vi.fn(async () =>
      JSON.stringify({ mistakes: "M", wins: "W", conclusions: "C" }),
    );
    const out = await summarizeReviews(
      [
        { date: "2026-10-01", mistakes: "a", wins: "b", conclusions: "c" },
        { date: "2026-10-02", mistakes: null, wins: "d", conclusions: null },
      ],
      call,
    );
    expect(out).toEqual({ mistakes: "M", wins: "W", conclusions: "C" });
    expect(call.mock.calls[0][0]).toContain("2026-10-01");
    expect(call.mock.calls[0][0]).toContain("2026-10-02");
  });
});

describe("default caller without API key", () => {
  it("throws a clear error when ANTHROPIC_API_KEY is unset", async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      await expect(splitReview("x")).rejects.toThrow(/ANTHROPIC_API_KEY/);
    } finally {
      if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
    }
  });
});
