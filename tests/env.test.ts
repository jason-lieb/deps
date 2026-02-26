import { describe, expect, test } from "bun:test";
import { generateEnvExports, getBinPaths } from "../src/env";
import type { Lockfile } from "../src/types";

describe("getBinPaths", () => {
  test("extracts bin paths from store paths", () => {
    const lockfile: Lockfile = {
      version: 1,
      hash: "abc",
      resolved: {
        "nodejs 20": {
          name: "nodejs",
          requestedVersion: "20",
          resolvedVersion: "20.11.0",
          nixpkgsCommit: "abc123",
          attr: "nodejs_20",
          storePath: "/nix/store/xxx-nodejs-20.11.0",
        },
      },
    };

    const paths = getBinPaths(lockfile);
    expect(paths).toContain("/nix/store/xxx-nodejs-20.11.0/bin");
  });
});

describe("generateEnvExports", () => {
  test("generates PATH export", () => {
    const lockfile: Lockfile = {
      version: 1,
      hash: "abc",
      resolved: {
        "nodejs 20": {
          name: "nodejs",
          requestedVersion: "20",
          resolvedVersion: "20.11.0",
          nixpkgsCommit: "abc123",
          attr: "nodejs_20",
          storePath: "/nix/store/xxx-nodejs-20.11.0",
        },
      },
    };

    const exports = generateEnvExports(lockfile);
    expect(exports).toContain("export PATH=");
    expect(exports).toContain("/nix/store/xxx-nodejs-20.11.0/bin");
  });
});
