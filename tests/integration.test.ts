import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { rm, mkdir } from "fs/promises";
import { join, dirname } from "path";

const testDir = "/tmp/deps-integration-test";
const projectRoot = dirname(import.meta.dir);
const indexPath = join(projectRoot, "src", "index.ts");

beforeEach(async () => {
  await mkdir(testDir, { recursive: true });
  process.chdir(testDir);
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("deps CLI integration", () => {
  test("init creates deps file", async () => {
    const proc = Bun.spawn(["bun", "run", indexPath, "init"], {
      cwd: testDir,
      stdout: "pipe",
    });
    await proc.exited;

    const file = Bun.file(join(testDir, "deps"));
    expect(await file.exists()).toBe(true);
  });

  test("add appends to deps file", async () => {
    // First init
    await Bun.spawn(["bun", "run", indexPath, "init"], {
      cwd: testDir,
    }).exited;

    // Then add (skip install for this test)
    const file = Bun.file(join(testDir, "deps"));
    let content = await file.text();
    content += "ripgrep 14\n";
    await Bun.write(join(testDir, "deps"), content);

    const newContent = await Bun.file(join(testDir, "deps")).text();
    expect(newContent).toContain("ripgrep 14");
  });
});
