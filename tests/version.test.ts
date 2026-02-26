import { describe, expect, test } from "bun:test";
import { parseVersion, matchesVersion } from "../src/version";

describe("parseVersion", () => {
  test("parses exact version", () => {
    const result = parseVersion("20.11.0");
    expect(result).toEqual({ type: "exact", value: "20.11.0" });
  });

  test("parses major version", () => {
    const result = parseVersion("20");
    expect(result).toEqual({ type: "major", value: "20" });
  });

  test("parses caret range", () => {
    const result = parseVersion("^1.6");
    expect(result).toEqual({ type: "caret", value: "1.6" });
  });

  test("parses gte range", () => {
    const result = parseVersion(">=3.10");
    expect(result).toEqual({ type: "gte", value: "3.10" });
  });
});

describe("matchesVersion", () => {
  test("exact version matches exactly", () => {
    expect(matchesVersion("20.11.0", { type: "exact", value: "20.11.0" })).toBe(true);
    expect(matchesVersion("20.11.1", { type: "exact", value: "20.11.0" })).toBe(false);
  });

  test("major version matches any minor/patch", () => {
    expect(matchesVersion("20.11.0", { type: "major", value: "20" })).toBe(true);
    expect(matchesVersion("20.0.0", { type: "major", value: "20" })).toBe(true);
    expect(matchesVersion("21.0.0", { type: "major", value: "20" })).toBe(false);
  });

  test("caret range matches compatible versions", () => {
    expect(matchesVersion("1.6.0", { type: "caret", value: "1.6" })).toBe(true);
    expect(matchesVersion("1.7.0", { type: "caret", value: "1.6" })).toBe(true);
    expect(matchesVersion("2.0.0", { type: "caret", value: "1.6" })).toBe(false);
  });

  test("gte range matches versions greater or equal", () => {
    expect(matchesVersion("3.10.0", { type: "gte", value: "3.10" })).toBe(true);
    expect(matchesVersion("3.11.0", { type: "gte", value: "3.10" })).toBe(true);
    expect(matchesVersion("3.9.0", { type: "gte", value: "3.10" })).toBe(false);
  });
});
