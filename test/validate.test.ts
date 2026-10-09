import { describe, it, expect } from "vitest";
import { parseTitle, parseBool } from "../lib/validate";

describe("parseTitle", () => {
  it("trims and accepts non-empty", () => {
    expect(parseTitle("  foo ")).toBe("foo");
  });
  it("rejects empty/whitespace/non-string", () => {
    expect(parseTitle("   ")).toBeUndefined();
    expect(parseTitle("")).toBeUndefined();
    expect(parseTitle(42)).toBeUndefined();
  });
});

describe("parseBool", () => {
  it("accepts true/false/0/1", () => {
    expect(parseBool(true)).toBe(1);
    expect(parseBool(false)).toBe(0);
    expect(parseBool(1)).toBe(1);
    expect(parseBool(0)).toBe(0);
  });
  it("rejects other values", () => {
    expect(parseBool("x")).toBeUndefined();
    expect(parseBool(2)).toBeUndefined();
    expect(parseBool(null)).toBeUndefined();
  });
});
