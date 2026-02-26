import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { readLockfile, writeLockfile, isLockfileStale } from "../src/lockfile";
import { rm, mkdir } from "fs/promises";
import { join } from "path";

const testDir = "/tmp/deps-test-lockfile";

beforeEach(async () => {
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("writeLockfile", () => {
  test("writes lockfile with hash", async () => {
    const depsContent = "nodejs 20";
    await writeLockfile(testDir, depsContent, {
      "nodejs 20": {
        name: "nodejs",
        requestedVersion: "20",
        resolvedVersion: "20.11.0",
        nixpkgsCommit: "abc123",
        attr: "nodejs_20",
        storePath: "/nix/store/xxx",
      },
    });

    const lockfile = await readLockfile(testDir);
    expect(lockfile).not.toBeNull();
    expect(lockfile!.version).toBe(1);
    expect(lockfile!.resolved["nodejs 20"].resolvedVersion).toBe("20.11.0");
  });
});

describe("isLockfileStale", () => {
  test("returns true when deps file changed", async () => {
    const depsContent = "nodejs 20";
    await writeLockfile(testDir, depsContent, {});

    const stale = await isLockfileStale(testDir, "nodejs 20\npython 3.11");
    expect(stale).toBe(true);
  });

  test("returns false when deps file unchanged", async () => {
    const depsContent = "nodejs 20";
    await writeLockfile(testDir, depsContent, {});

    const stale = await isLockfileStale(testDir, depsContent);
    expect(stale).toBe(false);
  });
});
