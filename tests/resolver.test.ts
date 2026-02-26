import { describe, expect, test } from "bun:test";
import { resolveDependency, resolveDependencies } from "../src/resolver";
import type { Dependency } from "../src/types";

describe("resolveDependency", () => {
  test("resolves exact version", async () => {
    const dep: Dependency = { name: "nodejs", version: "20.11.0", raw: "nodejs 20.11.0", line: 1 };
    const result = await resolveDependency(dep);
    expect(result.resolvedVersion).toBe("20.11.0");
    expect(result.nixpkgsCommit).toBe("abc123def");
    expect(result.attr).toBe("nodejs_20");
  });

  test("resolves major version to latest", async () => {
    const dep: Dependency = { name: "nodejs", version: "20", raw: "nodejs 20", line: 1 };
    const result = await resolveDependency(dep);
    expect(result.resolvedVersion).toBe("20.11.0"); // highest 20.x
  });

  test("resolves caret range", async () => {
    const dep: Dependency = { name: "jq", version: "^1.6", raw: "jq ^1.6", line: 1 };
    const result = await resolveDependency(dep);
    expect(result.resolvedVersion).toBe("1.7.0"); // highest compatible
  });

  test("throws on unavailable version", async () => {
    const dep: Dependency = { name: "nodejs", version: "99.0.0", raw: "nodejs 99.0.0", line: 1 };
    await expect(resolveDependency(dep)).rejects.toThrow("not found");
  });
});
