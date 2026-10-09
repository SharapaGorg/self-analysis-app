import { describe, it, expect } from "vitest";
import { parseTitle, parseBool, parsePomodoros } from "../lib/validate";

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

describe("parsePomodoros", () => {
  it("accepts fractional and whole non-negative numbers", () => {
    expect(parsePomodoros(1.5)).toBe(1.5);
    expect(parsePomodoros(0.25)).toBe(0.25);
    expect(parsePomodoros(3)).toBe(3);
    expect(parsePomodoros(0)).toBe(0);
  });
  it("rejects negatives and non-numbers", () => {
    expect(parsePomodoros(-1)).toBeUndefined();
    expect(parsePomodoros(Infinity)).toBeUndefined();
    expect(parsePomodoros("2")).toBeUndefined();
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
