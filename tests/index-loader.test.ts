import { describe, expect, test } from "bun:test";
import { loadIndex, lookupVersions } from "../src/index-loader";

describe("loadIndex", () => {
  test("loads bundled index", async () => {
    const index = await loadIndex();
    expect(index.version).toBe(1);
    expect(index.packages).toBeDefined();
    expect(index.packages.nodejs).toBeDefined();
  });
});

describe("lookupVersions", () => {
  test("returns available versions for package", async () => {
    const index = await loadIndex();
    const versions = lookupVersions(index, "nodejs");
    expect(versions).toContain("20.11.0");
    expect(versions).toContain("18.19.0");
  });

  test("returns empty array for unknown package", async () => {
    const index = await loadIndex();
    const versions = lookupVersions(index, "nonexistent");
    expect(versions).toEqual([]);
  });
});
