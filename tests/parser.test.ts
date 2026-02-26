import { describe, expect, test } from "bun:test";
import { parseDepsFile } from "../src/parser";

describe("parseDepsFile", () => {
  test("parses simple dependency", () => {
    const content = "nodejs 20";
    const result = parseDepsFile(content);
    expect(result).toEqual([
      { name: "nodejs", version: "20", raw: "nodejs 20", line: 1 }
    ]);
  });
});
