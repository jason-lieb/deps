import { describe, expect, test } from "bun:test";
import { getGlobalDepsDir, getGlobalDepsPath, getGlobalLockfilePath } from "../src/paths";
import { homedir } from "os";
import { join } from "path";

describe("paths", () => {
  test("getGlobalDepsDir returns ~/.config/deps", () => {
    expect(getGlobalDepsDir()).toBe(join(homedir(), ".config", "deps"));
  });

  test("getGlobalDepsPath returns ~/.config/deps/deps", () => {
    expect(getGlobalDepsPath()).toBe(join(homedir(), ".config", "deps", "deps"));
  });

  test("getGlobalLockfilePath returns ~/.config/deps/deps.lock", () => {
    expect(getGlobalLockfilePath()).toBe(join(homedir(), ".config", "deps", "deps.lock"));
  });
});
