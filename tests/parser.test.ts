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

  test("ignores comments", () => {
    const content = "# this is a comment\nnodejs 20";
    const result = parseDepsFile(content);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("nodejs");
  });

  test("ignores empty lines", () => {
    const content = "nodejs 20\n\npython 3.11";
    const result = parseDepsFile(content);
    expect(result).toHaveLength(2);
  });

  test("handles multiple dependencies", () => {
    const content = `# Development tools
nodejs 20
python 3.11.0
ripgrep 14
jq ^1.6`;
    const result = parseDepsFile(content);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ name: "nodejs", version: "20", raw: "nodejs 20", line: 2 });
    expect(result[3]).toEqual({ name: "jq", version: "^1.6", raw: "jq ^1.6", line: 5 });
  });

  test("throws on invalid format", () => {
    const content = "nodejsnoversion";
    expect(() => parseDepsFile(content)).toThrow("Invalid dependency format");
  });
});
