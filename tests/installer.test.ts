import { describe, expect, test } from "bun:test";
import { getProfilePath, buildNixInstallCommand, ensureInstalled } from "../src/installer";

describe("getProfilePath", () => {
  test("returns consistent path for same directory", () => {
    const path1 = getProfilePath("/home/user/project");
    const path2 = getProfilePath("/home/user/project");
    expect(path1).toBe(path2);
  });

  test("returns different path for different directories", () => {
    const path1 = getProfilePath("/home/user/project1");
    const path2 = getProfilePath("/home/user/project2");
    expect(path1).not.toBe(path2);
  });

  test("path is under ~/.local/state/deps/profiles", () => {
    const path = getProfilePath("/home/user/project");
    expect(path).toContain(".local/state/deps/profiles");
  });
});

describe("buildNixInstallCommand", () => {
  test("builds correct nix profile install command", () => {
    const cmd = buildNixInstallCommand(
      "/home/user/.local/state/deps/profiles/abc123",
      "def456",
      "nodejs_20"
    );
    expect(cmd).toContain("nix profile install");
    expect(cmd).toContain("--profile");
    expect(cmd).toContain("github:NixOS/nixpkgs/def456#nodejs_20");
  });
});

describe("ensureInstalled", () => {
  test("returns null when no deps file exists", async () => {
    const result = await ensureInstalled("/nonexistent/path");
    expect(result).toBeNull();
  });
});
