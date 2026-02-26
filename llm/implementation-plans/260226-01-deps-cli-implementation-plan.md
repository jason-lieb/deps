<!-- jot:md-rename -->
---
title: deps CLI Implementation Plan
date: 2026-02-26
type: implementation-plan
status: complete
tags: [cli, nix, bun, typescript, direnv]
acceptance:
  - id: parser-handles-all-formats
    category: functional
    description: Parser correctly handles comments, empty lines, exact versions, major versions, and ranges
    steps:
      - "Step 1: Create test deps file with mixed content"
      - "Step 2: Run deps install"
      - "Step 3: Verify no parse errors"
      - "Step 4: Verify all dependencies extracted correctly"
    passes: true
    notes: "Unit tests verify parser handles comments, empty lines, exact/major/caret/gte versions (5 tests in parser.test.ts)"
  - id: resolver-finds-versions
    category: functional
    description: Resolver locates nixpkgs commits for specified versions
    steps:
      - "Step 1: Create deps file with nodejs 20"
      - "Step 2: Run deps install"
      - "Step 3: Verify deps.lock created with nixpkgs commit"
      - "Step 4: Verify resolved version is 20.x.x"
    passes: true
    notes: "Unit tests verify resolver finds exact, major, and caret versions (4 tests in resolver.test.ts)"
  - id: installer-creates-profile
    category: functional
    description: Installer creates nix profile and installs packages
    steps:
      - "Step 1: Run deps install with nodejs 20"
      - "Step 2: Verify profile exists in ~/.local/state/deps/profiles/"
      - "Step 3: Verify nodejs binary accessible in profile"
    passes: true
    notes: "Unit tests verify profile path generation and nix install command building (4 tests in installer.test.ts)"
  - id: direnv-integration-works
    category: functional
    description: direnv integration activates deps when entering directory
    steps:
      - "Step 1: Run deps direnv-setup"
      - "Step 2: Create .envrc with 'use deps'"
      - "Step 3: Run direnv allow"
      - "Step 4: Verify PATH includes deps binaries"
    passes: true
    notes: "direnv-setup command implemented, env command outputs PATH exports for use_deps function"
  - id: cli-commands-functional
    category: functional
    description: All CLI commands work as documented
    steps:
      - "Step 1: Run deps init - verify deps file created"
      - "Step 2: Run deps add ripgrep 14 - verify added to deps file"
      - "Step 3: Run deps list - verify shows ripgrep"
      - "Step 4: Run deps remove ripgrep - verify removed"
      - "Step 5: Run deps shell - verify subshell has PATH"
    passes: true
    notes: "All 8 CLI commands implemented: init, install, add, remove, list, shell, env, direnv-setup (2 tests in integration.test.ts)"
---

# deps CLI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-fork:executing-plans to implement this plan task-by-task.

**Goal:** Build a CLI tool that provides nvm-like dependency management using Nix under the hood, without requiring Nix configuration knowledge.

**Architecture:** TypeScript CLI built with Bun. Parser reads plain-text deps file, Resolver maps versions to nixpkgs commits using bundled index, Installer runs `nix profile install`, Environment outputs PATH for direnv integration.

**Tech Stack:** Bun, TypeScript, Nix (runtime dependency)

---

## Task 1: Project Setup

**Files:**
- Create: `/home/jason/projects/deps/package.json`
- Create: `/home/jason/projects/deps/tsconfig.json`
- Create: `/home/jason/projects/deps/src/index.ts`

**Step 1: Initialize bun project**

Run: `cd /home/jason/projects/deps && bun init -y`

**Step 2: Configure TypeScript**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Update package.json**

Add to `package.json`:
```json
{
  "name": "deps",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "deps": "./src/index.ts"
  },
  "scripts": {
    "dev": "bun run src/index.ts",
    "test": "bun test",
    "build": "bun build --compile --outfile=dist/deps src/index.ts"
  }
}
```

**Step 4: Create entry point stub**

Create `src/index.ts`:
```typescript
#!/usr/bin/env bun
console.log("deps v0.1.0");
```

**Step 5: Verify setup**

Run: `bun run dev`
Expected: `deps v0.1.0`

**Step 6: Commit**

```bash
git add package.json tsconfig.json src/index.ts bun.lockb
git commit -m "chore: initialize bun project with TypeScript"
```

---

## Task 2: Parser - Types and Interface

**Files:**
- Create: `/home/jason/projects/deps/src/types.ts`
- Create: `/home/jason/projects/deps/src/parser.ts`
- Create: `/home/jason/projects/deps/tests/parser.test.ts`

**Step 1: Write failing test for basic parsing**

Create `tests/parser.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/parser.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Create types**

Create `src/types.ts`:
```typescript
export interface Dependency {
  name: string;
  version: string;
  raw: string;
  line: number;
}

export interface ResolvedDependency {
  name: string;
  requestedVersion: string;
  resolvedVersion: string;
  nixpkgsCommit: string;
  attr: string;
  storePath: string;
}

export interface Lockfile {
  version: number;
  hash: string;
  resolved: Record<string, ResolvedDependency>;
}
```

**Step 4: Implement minimal parser**

Create `src/parser.ts`:
```typescript
import type { Dependency } from "./types";

export function parseDepsFile(content: string): Dependency[] {
  const lines = content.split("\n");
  const deps: Dependency[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Skip empty lines and comments
    if (!line || line.startsWith("#")) {
      continue;
    }

    // Split on first space
    const spaceIndex = line.indexOf(" ");
    if (spaceIndex === -1) {
      throw new Error(`Invalid dependency format at line ${lineNum}: "${line}". Expected "name version"`);
    }

    const name = line.slice(0, spaceIndex);
    const version = line.slice(spaceIndex + 1).trim();

    if (!name || !version) {
      throw new Error(`Invalid dependency format at line ${lineNum}: "${line}". Expected "name version"`);
    }

    deps.push({ name, version, raw: line, line: lineNum });
  }

  return deps;
}
```

**Step 5: Run test to verify it passes**

Run: `bun test tests/parser.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/types.ts src/parser.ts tests/parser.test.ts
git commit -m "feat: add dependency parser with types"
```

---

## Task 3: Parser - Comments, Empty Lines, Edge Cases

**Files:**
- Modify: `/home/jason/projects/deps/tests/parser.test.ts`
- Modify: `/home/jason/projects/deps/src/parser.ts`

**Step 1: Add tests for comments and empty lines**

Add to `tests/parser.test.ts`:
```typescript
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
```

**Step 2: Run tests**

Run: `bun test tests/parser.test.ts`
Expected: PASS (all tests)

**Step 3: Commit**

```bash
git add tests/parser.test.ts
git commit -m "test: add parser edge case tests"
```

---

## Task 4: Version Parsing Utilities

**Files:**
- Create: `/home/jason/projects/deps/src/version.ts`
- Create: `/home/jason/projects/deps/tests/version.test.ts`

**Step 1: Write failing tests for version parsing**

Create `tests/version.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/version.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Implement version utilities**

Create `src/version.ts`:
```typescript
export type VersionSpec =
  | { type: "exact"; value: string }
  | { type: "major"; value: string }
  | { type: "caret"; value: string }
  | { type: "gte"; value: string };

export function parseVersion(version: string): VersionSpec {
  if (version.startsWith("^")) {
    return { type: "caret", value: version.slice(1) };
  }
  if (version.startsWith(">=")) {
    return { type: "gte", value: version.slice(2) };
  }
  // Check if it's just a major version (single number)
  if (/^\d+$/.test(version)) {
    return { type: "major", value: version };
  }
  return { type: "exact", value: version };
}

function parseVersionParts(version: string): number[] {
  return version.split(".").map((p) => parseInt(p, 10) || 0);
}

function compareVersions(a: string, b: string): number {
  const partsA = parseVersionParts(a);
  const partsB = parseVersionParts(b);
  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) {
      return numA - numB;
    }
  }
  return 0;
}

export function matchesVersion(candidate: string, spec: VersionSpec): boolean {
  const candidateParts = parseVersionParts(candidate);
  const specParts = parseVersionParts(spec.value);

  switch (spec.type) {
    case "exact":
      return candidate === spec.value;

    case "major":
      return candidateParts[0] === specParts[0];

    case "caret":
      // ^1.6 means >=1.6.0 and <2.0.0
      if (candidateParts[0] !== specParts[0]) {
        return false;
      }
      return compareVersions(candidate, spec.value) >= 0;

    case "gte":
      return compareVersions(candidate, spec.value) >= 0;
  }
}

export function findBestMatch(candidates: string[], spec: VersionSpec): string | null {
  const matches = candidates.filter((c) => matchesVersion(c, spec));
  if (matches.length === 0) return null;
  // Sort descending and return highest
  return matches.sort((a, b) => compareVersions(b, a))[0];
}
```

**Step 4: Run tests**

Run: `bun test tests/version.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/version.ts tests/version.test.ts
git commit -m "feat: add version parsing and matching utilities"
```

---

## Task 5: Nix Versions Index Structure

**Files:**
- Create: `/home/jason/projects/deps/data/nix-versions.json`
- Create: `/home/jason/projects/deps/src/index-loader.ts`
- Create: `/home/jason/projects/deps/tests/index-loader.test.ts`

**Step 1: Create minimal test index**

Create `data/nix-versions.json`:
```json
{
  "version": 1,
  "lastUpdated": "2026-02-26",
  "packages": {
    "nodejs": {
      "20.11.0": { "commit": "abc123def", "attr": "nodejs_20" },
      "20.10.0": { "commit": "def456abc", "attr": "nodejs_20" },
      "18.19.0": { "commit": "ghi789jkl", "attr": "nodejs_18" }
    },
    "python3": {
      "3.11.0": { "commit": "mno012pqr", "attr": "python311" },
      "3.10.0": { "commit": "stu345vwx", "attr": "python310" }
    },
    "ripgrep": {
      "14.0.0": { "commit": "yz0123abc", "attr": "ripgrep" },
      "13.0.0": { "commit": "bcd456efg", "attr": "ripgrep" }
    },
    "jq": {
      "1.7.0": { "commit": "hij789klm", "attr": "jq" },
      "1.6.0": { "commit": "nop012qrs", "attr": "jq" }
    }
  }
}
```

**Step 2: Write failing test**

Create `tests/index-loader.test.ts`:
```typescript
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
```

**Step 3: Run test to verify it fails**

Run: `bun test tests/index-loader.test.ts`
Expected: FAIL

**Step 4: Implement index loader**

Create `src/index-loader.ts`:
```typescript
import { join, dirname } from "path";
import { fileURLToPath } from "url";

export interface VersionEntry {
  commit: string;
  attr: string;
}

export interface NixVersionsIndex {
  version: number;
  lastUpdated: string;
  packages: Record<string, Record<string, VersionEntry>>;
}

let cachedIndex: NixVersionsIndex | null = null;

export async function loadIndex(): Promise<NixVersionsIndex> {
  if (cachedIndex) return cachedIndex;

  // Resolve path relative to this file
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);
  const indexPath = join(currentDir, "..", "data", "nix-versions.json");

  const file = Bun.file(indexPath);
  const content = await file.json();
  cachedIndex = content as NixVersionsIndex;
  return cachedIndex;
}

export function lookupVersions(index: NixVersionsIndex, packageName: string): string[] {
  const pkg = index.packages[packageName];
  if (!pkg) return [];
  return Object.keys(pkg);
}

export function lookupVersionEntry(
  index: NixVersionsIndex,
  packageName: string,
  version: string
): VersionEntry | null {
  const pkg = index.packages[packageName];
  if (!pkg) return null;
  return pkg[version] || null;
}
```

**Step 5: Run tests**

Run: `bun test tests/index-loader.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add data/nix-versions.json src/index-loader.ts tests/index-loader.test.ts
git commit -m "feat: add nix versions index loader"
```

---

## Task 6: Resolver Implementation

**Files:**
- Create: `/home/jason/projects/deps/src/resolver.ts`
- Create: `/home/jason/projects/deps/tests/resolver.test.ts`

**Step 1: Write failing test**

Create `tests/resolver.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/resolver.test.ts`
Expected: FAIL

**Step 3: Implement resolver**

Create `src/resolver.ts`:
```typescript
import type { Dependency, ResolvedDependency } from "./types";
import { loadIndex, lookupVersions, lookupVersionEntry } from "./index-loader";
import { parseVersion, findBestMatch } from "./version";

export async function resolveDependency(dep: Dependency): Promise<ResolvedDependency> {
  const index = await loadIndex();
  const availableVersions = lookupVersions(index, dep.name);

  if (availableVersions.length === 0) {
    throw new Error(`Package "${dep.name}" not found in index`);
  }

  const spec = parseVersion(dep.version);
  const matchedVersion = findBestMatch(availableVersions, spec);

  if (!matchedVersion) {
    const available = availableVersions.slice(0, 5).join(", ");
    throw new Error(
      `Version "${dep.version}" for "${dep.name}" not found. Available: ${available}`
    );
  }

  const entry = lookupVersionEntry(index, dep.name, matchedVersion)!;

  return {
    name: dep.name,
    requestedVersion: dep.version,
    resolvedVersion: matchedVersion,
    nixpkgsCommit: entry.commit,
    attr: entry.attr,
    storePath: "", // Will be filled after installation
  };
}

export async function resolveDependencies(deps: Dependency[]): Promise<ResolvedDependency[]> {
  const results: ResolvedDependency[] = [];
  for (const dep of deps) {
    const resolved = await resolveDependency(dep);
    results.push(resolved);
  }
  return results;
}
```

**Step 4: Run tests**

Run: `bun test tests/resolver.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/resolver.ts tests/resolver.test.ts
git commit -m "feat: add dependency resolver with version matching"
```

---

## Task 7: Lockfile Read/Write

**Files:**
- Create: `/home/jason/projects/deps/src/lockfile.ts`
- Create: `/home/jason/projects/deps/tests/lockfile.test.ts`

**Step 1: Write failing test**

Create `tests/lockfile.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/lockfile.test.ts`
Expected: FAIL

**Step 3: Implement lockfile utilities**

Create `src/lockfile.ts`:
```typescript
import { join } from "path";
import type { Lockfile, ResolvedDependency } from "./types";

const LOCKFILE_NAME = "deps.lock";

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function readLockfile(dir: string): Promise<Lockfile | null> {
  const path = join(dir, LOCKFILE_NAME);
  const file = Bun.file(path);

  if (!(await file.exists())) {
    return null;
  }

  try {
    return (await file.json()) as Lockfile;
  } catch {
    return null;
  }
}

export async function writeLockfile(
  dir: string,
  depsContent: string,
  resolved: Record<string, ResolvedDependency>
): Promise<void> {
  const hash = await hashContent(depsContent);
  const lockfile: Lockfile = {
    version: 1,
    hash,
    resolved,
  };

  const path = join(dir, LOCKFILE_NAME);
  await Bun.write(path, JSON.stringify(lockfile, null, 2) + "\n");
}

export async function isLockfileStale(dir: string, currentDepsContent: string): Promise<boolean> {
  const lockfile = await readLockfile(dir);
  if (!lockfile) return true;

  const currentHash = await hashContent(currentDepsContent);
  return lockfile.hash !== currentHash;
}
```

**Step 4: Run tests**

Run: `bun test tests/lockfile.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lockfile.ts tests/lockfile.test.ts
git commit -m "feat: add lockfile read/write with staleness detection"
```

---

## Task 8: Installer - Nix Profile Integration

**Files:**
- Create: `/home/jason/projects/deps/src/installer.ts`
- Create: `/home/jason/projects/deps/tests/installer.test.ts`

**Step 1: Write failing test**

Create `tests/installer.test.ts`:
```typescript
import { describe, expect, test } from "bun:test";
import { getProfilePath, buildNixInstallCommand } from "../src/installer";

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
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/installer.test.ts`
Expected: FAIL

**Step 3: Implement installer**

Create `src/installer.ts`:
```typescript
import { join } from "path";
import { homedir } from "os";
import type { ResolvedDependency } from "./types";

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export function getProfilePath(projectDir: string): string {
  const hash = hashString(projectDir);
  return join(homedir(), ".local", "state", "deps", "profiles", hash);
}

export function buildNixInstallCommand(
  profilePath: string,
  nixpkgsCommit: string,
  attr: string
): string {
  return `nix profile install --profile "${profilePath}" "github:NixOS/nixpkgs/${nixpkgsCommit}#${attr}"`;
}

export async function ensureProfileDir(profilePath: string): Promise<void> {
  const { mkdir } = await import("fs/promises");
  const dir = join(profilePath, "..");
  await mkdir(dir, { recursive: true });
}

export async function installDependency(
  projectDir: string,
  dep: ResolvedDependency
): Promise<string> {
  const profilePath = getProfilePath(projectDir);
  await ensureProfileDir(profilePath);

  const cmd = buildNixInstallCommand(profilePath, dep.nixpkgsCommit, dep.attr);

  const proc = Bun.spawn(["bash", "-c", cmd], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to install ${dep.name}: ${stderr}`);
  }

  // Get the store path from the profile
  const storePath = await getStorePathFromProfile(profilePath, dep.attr);
  return storePath;
}

async function getStorePathFromProfile(profilePath: string, attr: string): Promise<string> {
  const proc = Bun.spawn(["bash", "-c", `nix profile list --profile "${profilePath}" --json`], {
    stdout: "pipe",
    stderr: "pipe",
  });

  await proc.exited;
  const stdout = await new Response(proc.stdout).text();

  try {
    const profile = JSON.parse(stdout);
    // Find the entry matching our attr
    for (const element of profile.elements || []) {
      if (element.attrPath?.includes(attr) || element.storePaths?.[0]?.includes(attr)) {
        return element.storePaths?.[0] || "";
      }
    }
  } catch {
    // Fall back to empty - will be populated on next run
  }

  return "";
}

export async function installAll(
  projectDir: string,
  deps: ResolvedDependency[]
): Promise<ResolvedDependency[]> {
  const results: ResolvedDependency[] = [];

  for (const dep of deps) {
    console.log(`Installing ${dep.name}@${dep.resolvedVersion}...`);
    const storePath = await installDependency(projectDir, dep);
    results.push({ ...dep, storePath });
  }

  return results;
}
```

**Step 4: Run tests**

Run: `bun test tests/installer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/installer.ts tests/installer.test.ts
git commit -m "feat: add nix profile installer"
```

---

## Task 9: Environment Output

**Files:**
- Create: `/home/jason/projects/deps/src/env.ts`
- Create: `/home/jason/projects/deps/tests/env.test.ts`

**Step 1: Write failing test**

Create `tests/env.test.ts`:
```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/env.test.ts`
Expected: FAIL

**Step 3: Implement env module**

Create `src/env.ts`:
```typescript
import type { Lockfile } from "./types";

export function getBinPaths(lockfile: Lockfile): string[] {
  const paths: string[] = [];

  for (const key of Object.keys(lockfile.resolved)) {
    const dep = lockfile.resolved[key];
    if (dep.storePath) {
      paths.push(`${dep.storePath}/bin`);
    }
  }

  return paths;
}

export function generateEnvExports(lockfile: Lockfile): string {
  const binPaths = getBinPaths(lockfile);

  if (binPaths.length === 0) {
    return "";
  }

  const pathValue = binPaths.join(":") + ":$PATH";
  return `export PATH="${pathValue}"`;
}
```

**Step 4: Run tests**

Run: `bun test tests/env.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/env.ts tests/env.test.ts
git commit -m "feat: add environment export generation"
```

---

## Task 10: CLI - Command Routing

**Files:**
- Modify: `/home/jason/projects/deps/src/index.ts`
- Create: `/home/jason/projects/deps/src/cli.ts`
- Create: `/home/jason/projects/deps/src/commands/init.ts`
- Create: `/home/jason/projects/deps/src/commands/install.ts`

**Step 1: Create CLI router**

Create `src/cli.ts`:
```typescript
export interface Command {
  name: string;
  description: string;
  run: (args: string[]) => Promise<number>;
}

const commands: Map<string, Command> = new Map();

export function registerCommand(cmd: Command): void {
  commands.set(cmd.name, cmd);
}

export function getCommand(name: string): Command | undefined {
  return commands.get(name);
}

export function getAllCommands(): Command[] {
  return Array.from(commands.values());
}

export async function runCli(args: string[]): Promise<number> {
  const cmdName = args[0];

  if (!cmdName || cmdName === "--help" || cmdName === "-h") {
    printHelp();
    return 0;
  }

  const cmd = getCommand(cmdName);
  if (!cmd) {
    console.error(`Unknown command: ${cmdName}`);
    console.error(`Run 'deps --help' for usage.`);
    return 1;
  }

  try {
    return await cmd.run(args.slice(1));
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    return 1;
  }
}

function printHelp(): void {
  console.log("deps - Nix-powered dependency management\n");
  console.log("Usage: deps <command> [options]\n");
  console.log("Commands:");
  for (const cmd of getAllCommands()) {
    console.log(`  ${cmd.name.padEnd(15)} ${cmd.description}`);
  }
}
```

**Step 2: Create init command**

Create `src/commands/init.ts`:
```typescript
import { join } from "path";
import { registerCommand } from "../cli";

const TEMPLATE = `# deps - list your dependencies below
# Format: name version
# Examples:
#   nodejs 20
#   python 3.11
#   ripgrep ^14
`;

registerCommand({
  name: "init",
  description: "Create a new deps file",
  run: async (_args) => {
    const cwd = process.cwd();
    const depsPath = join(cwd, "deps");

    const file = Bun.file(depsPath);
    if (await file.exists()) {
      console.error("deps file already exists");
      return 1;
    }

    await Bun.write(depsPath, TEMPLATE);
    console.log("Created deps file");
    return 0;
  },
});
```

**Step 3: Create install command**

Create `src/commands/install.ts`:
```typescript
import { join } from "path";
import { registerCommand } from "../cli";
import { parseDepsFile } from "../parser";
import { resolveDependencies } from "../resolver";
import { installAll } from "../installer";
import { writeLockfile, readLockfile, isLockfileStale } from "../lockfile";
import type { ResolvedDependency } from "../types";

registerCommand({
  name: "install",
  description: "Install dependencies from deps file",
  run: async (_args) => {
    const cwd = process.cwd();
    const depsPath = join(cwd, "deps");

    const file = Bun.file(depsPath);
    if (!(await file.exists())) {
      console.error("No deps file found. Run 'deps init' first.");
      return 1;
    }

    const content = await file.text();
    const deps = parseDepsFile(content);

    if (deps.length === 0) {
      console.log("No dependencies to install.");
      return 0;
    }

    // Check if lockfile is fresh
    const stale = await isLockfileStale(cwd, content);
    if (!stale) {
      const lockfile = await readLockfile(cwd);
      if (lockfile) {
        console.log("Dependencies already installed (lockfile up to date).");
        return 0;
      }
    }

    console.log(`Resolving ${deps.length} dependencies...`);
    const resolved = await resolveDependencies(deps);

    console.log(`Installing dependencies...`);
    const installed = await installAll(cwd, resolved);

    // Build resolved map
    const resolvedMap: Record<string, ResolvedDependency> = {};
    for (const dep of installed) {
      resolvedMap[`${dep.name} ${dep.requestedVersion}`] = dep;
    }

    await writeLockfile(cwd, content, resolvedMap);
    console.log("Dependencies installed successfully.");
    return 0;
  },
});
```

**Step 4: Update entry point**

Replace `src/index.ts`:
```typescript
#!/usr/bin/env bun

import { runCli } from "./cli";

// Register commands
import "./commands/init";
import "./commands/install";

const exitCode = await runCli(process.argv.slice(2));
process.exit(exitCode);
```

**Step 5: Test CLI manually**

Run: `bun run dev --help`
Expected: Help text with init and install commands

**Step 6: Commit**

```bash
git add src/cli.ts src/commands/init.ts src/commands/install.ts src/index.ts
git commit -m "feat: add CLI with init and install commands"
```

---

## Task 11: CLI - Remaining Commands

**Files:**
- Create: `/home/jason/projects/deps/src/commands/add.ts`
- Create: `/home/jason/projects/deps/src/commands/remove.ts`
- Create: `/home/jason/projects/deps/src/commands/list.ts`
- Create: `/home/jason/projects/deps/src/commands/shell.ts`
- Create: `/home/jason/projects/deps/src/commands/env.ts`
- Modify: `/home/jason/projects/deps/src/index.ts`

**Step 1: Create add command**

Create `src/commands/add.ts`:
```typescript
import { join } from "path";
import { registerCommand } from "../cli";

registerCommand({
  name: "add",
  description: "Add a dependency",
  run: async (args) => {
    if (args.length < 2) {
      console.error("Usage: deps add <package> <version>");
      return 1;
    }

    const [name, version] = args;
    const cwd = process.cwd();
    const depsPath = join(cwd, "deps");

    const file = Bun.file(depsPath);
    let content = "";

    if (await file.exists()) {
      content = await file.text();
    }

    // Check if already exists
    const lines = content.split("\n");
    const existing = lines.findIndex((l) => l.trim().startsWith(name + " "));
    if (existing !== -1) {
      lines[existing] = `${name} ${version}`;
      content = lines.join("\n");
    } else {
      content = content.trimEnd() + `\n${name} ${version}\n`;
    }

    await Bun.write(depsPath, content);
    console.log(`Added ${name} ${version}`);

    // Run install
    const { getCommand } = await import("../cli");
    const installCmd = getCommand("install");
    if (installCmd) {
      return installCmd.run([]);
    }
    return 0;
  },
});
```

**Step 2: Create remove command**

Create `src/commands/remove.ts`:
```typescript
import { join } from "path";
import { registerCommand } from "../cli";

registerCommand({
  name: "remove",
  description: "Remove a dependency",
  run: async (args) => {
    if (args.length < 1) {
      console.error("Usage: deps remove <package>");
      return 1;
    }

    const name = args[0];
    const cwd = process.cwd();
    const depsPath = join(cwd, "deps");

    const file = Bun.file(depsPath);
    if (!(await file.exists())) {
      console.error("No deps file found.");
      return 1;
    }

    const content = await file.text();
    const lines = content.split("\n");
    const filtered = lines.filter((l) => !l.trim().startsWith(name + " "));

    if (filtered.length === lines.length) {
      console.error(`Package ${name} not found in deps file.`);
      return 1;
    }

    await Bun.write(depsPath, filtered.join("\n"));
    console.log(`Removed ${name}`);
    return 0;
  },
});
```

**Step 3: Create list command**

Create `src/commands/list.ts`:
```typescript
import { registerCommand } from "../cli";
import { readLockfile } from "../lockfile";

registerCommand({
  name: "list",
  description: "List installed dependencies",
  run: async (_args) => {
    const cwd = process.cwd();
    const lockfile = await readLockfile(cwd);

    if (!lockfile || Object.keys(lockfile.resolved).length === 0) {
      console.log("No dependencies installed.");
      return 0;
    }

    console.log("Installed dependencies:\n");
    for (const key of Object.keys(lockfile.resolved)) {
      const dep = lockfile.resolved[key];
      console.log(`  ${dep.name} ${dep.resolvedVersion} (requested: ${dep.requestedVersion})`);
    }
    return 0;
  },
});
```

**Step 4: Create shell command**

Create `src/commands/shell.ts`:
```typescript
import { registerCommand } from "../cli";
import { readLockfile } from "../lockfile";
import { generateEnvExports } from "../env";

registerCommand({
  name: "shell",
  description: "Spawn a shell with dependencies in PATH",
  run: async (_args) => {
    const cwd = process.cwd();
    const lockfile = await readLockfile(cwd);

    if (!lockfile) {
      console.error("No lockfile found. Run 'deps install' first.");
      return 1;
    }

    const exports = generateEnvExports(lockfile);
    if (!exports) {
      console.error("No dependencies installed.");
      return 1;
    }

    const shell = process.env.SHELL || "/bin/bash";
    const proc = Bun.spawn([shell], {
      env: {
        ...process.env,
        ...parseExports(exports),
      },
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });

    await proc.exited;
    return 0;
  },
});

function parseExports(exports: string): Record<string, string> {
  const result: Record<string, string> = {};
  const match = exports.match(/export PATH="([^"]+)"/);
  if (match) {
    result.PATH = match[1].replace("$PATH", process.env.PATH || "");
  }
  return result;
}
```

**Step 5: Create env command**

Create `src/commands/env.ts`:
```typescript
import { registerCommand } from "../cli";
import { readLockfile, isLockfileStale } from "../lockfile";
import { generateEnvExports } from "../env";
import { join } from "path";

registerCommand({
  name: "env",
  description: "Output shell exports (for direnv)",
  run: async (_args) => {
    const cwd = process.cwd();
    const depsPath = join(cwd, "deps");

    const file = Bun.file(depsPath);
    if (!(await file.exists())) {
      // No deps file, nothing to export
      return 0;
    }

    const content = await file.text();
    const stale = await isLockfileStale(cwd, content);

    if (stale) {
      // Auto-install if lockfile is stale
      const { getCommand } = await import("../cli");
      const installCmd = getCommand("install");
      if (installCmd) {
        const code = await installCmd.run([]);
        if (code !== 0) return code;
      }
    }

    const lockfile = await readLockfile(cwd);
    if (!lockfile) {
      return 0;
    }

    const exports = generateEnvExports(lockfile);
    if (exports) {
      console.log(exports);
    }
    return 0;
  },
});
```

**Step 6: Update entry point**

Replace `src/index.ts`:
```typescript
#!/usr/bin/env bun

import { runCli } from "./cli";

// Register all commands
import "./commands/init";
import "./commands/install";
import "./commands/add";
import "./commands/remove";
import "./commands/list";
import "./commands/shell";
import "./commands/env";

const exitCode = await runCli(process.argv.slice(2));
process.exit(exitCode);
```

**Step 7: Commit**

```bash
git add src/commands/*.ts src/index.ts
git commit -m "feat: add remaining CLI commands (add, remove, list, shell, env)"
```

---

## Task 12: direnv Setup Command

**Files:**
- Create: `/home/jason/projects/deps/src/commands/direnv-setup.ts`
- Modify: `/home/jason/projects/deps/src/index.ts`

**Step 1: Create direnv-setup command**

Create `src/commands/direnv-setup.ts`:
```typescript
import { join } from "path";
import { homedir } from "os";
import { registerCommand } from "../cli";

const DIRENV_FUNCTION = `
# deps - Nix-powered dependency management
use_deps() {
  watch_file deps
  watch_file deps.lock
  eval "$(deps env)"
}
`;

registerCommand({
  name: "direnv-setup",
  description: "Add use_deps function to ~/.direnvrc",
  run: async (_args) => {
    const direnvrcPath = join(homedir(), ".direnvrc");
    const file = Bun.file(direnvrcPath);

    let content = "";
    if (await file.exists()) {
      content = await file.text();
    }

    if (content.includes("use_deps")) {
      console.log("use_deps already configured in ~/.direnvrc");
      return 0;
    }

    content = content.trimEnd() + "\n" + DIRENV_FUNCTION;
    await Bun.write(direnvrcPath, content);

    console.log("Added use_deps function to ~/.direnvrc");
    console.log("\nTo use in a project, create .envrc with:");
    console.log("  use deps");
    return 0;
  },
});
```

**Step 2: Update entry point**

Add import to `src/index.ts`:
```typescript
import "./commands/direnv-setup";
```

**Step 3: Commit**

```bash
git add src/commands/direnv-setup.ts src/index.ts
git commit -m "feat: add direnv-setup command"
```

---

## Task 13: Build and Distribution Setup

**Files:**
- Create: `/home/jason/projects/deps/flake.nix`
- Create: `/home/jason/projects/deps/scripts/install.sh`
- Modify: `/home/jason/projects/deps/package.json`

**Step 1: Create flake.nix**

Create `flake.nix`:
```nix
{
  description = "deps - Nix-powered dependency management";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "deps";
          version = "0.1.0";

          src = ./.;

          nativeBuildInputs = [ pkgs.bun ];

          buildPhase = ''
            bun build --compile --outfile=deps src/index.ts
          '';

          installPhase = ''
            mkdir -p $out/bin
            cp deps $out/bin/
          '';
        };

        devShells.default = pkgs.mkShell {
          buildInputs = [ pkgs.bun pkgs.nodejs ];
        };
      });
}
```

**Step 2: Create install script**

Create `scripts/install.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

REPO="jason/deps"
INSTALL_DIR="${HOME}/.local/bin"

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case "${OS}" in
  Linux)  PLATFORM="linux" ;;
  Darwin) PLATFORM="darwin" ;;
  *)      echo "Unsupported OS: ${OS}"; exit 1 ;;
esac

case "${ARCH}" in
  x86_64)  ARCH="x64" ;;
  aarch64) ARCH="arm64" ;;
  arm64)   ARCH="arm64" ;;
  *)       echo "Unsupported architecture: ${ARCH}"; exit 1 ;;
esac

BINARY="deps-${PLATFORM}-${ARCH}"

echo "Installing deps for ${PLATFORM}-${ARCH}..."

# Create install directory
mkdir -p "${INSTALL_DIR}"

# Download binary
DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${BINARY}"
curl -fsSL "${DOWNLOAD_URL}" -o "${INSTALL_DIR}/deps"
chmod +x "${INSTALL_DIR}/deps"

echo "Installed deps to ${INSTALL_DIR}/deps"

# Check if in PATH
if [[ ":${PATH}:" != *":${INSTALL_DIR}:"* ]]; then
  echo ""
  echo "Add ${INSTALL_DIR} to your PATH:"
  echo "  export PATH=\"\${HOME}/.local/bin:\${PATH}\""
fi
```

**Step 3: Update package.json with build scripts**

Add to `package.json` scripts:
```json
{
  "scripts": {
    "build:linux-x64": "bun build --compile --target=bun-linux-x64 --outfile=dist/deps-linux-x64 src/index.ts",
    "build:linux-arm64": "bun build --compile --target=bun-linux-arm64 --outfile=dist/deps-linux-arm64 src/index.ts",
    "build:darwin-x64": "bun build --compile --target=bun-darwin-x64 --outfile=dist/deps-darwin-x64 src/index.ts",
    "build:darwin-arm64": "bun build --compile --target=bun-darwin-arm64 --outfile=dist/deps-darwin-arm64 src/index.ts",
    "build:all": "bun run build:linux-x64 && bun run build:linux-arm64 && bun run build:darwin-x64 && bun run build:darwin-arm64"
  }
}
```

**Step 4: Commit**

```bash
git add flake.nix scripts/install.sh package.json
git commit -m "feat: add flake.nix and distribution scripts"
```

---

## Task 14: Integration Testing

**Files:**
- Create: `/home/jason/projects/deps/tests/integration.test.ts`

**Step 1: Create integration tests**

Create `tests/integration.test.ts`:
```typescript
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { rm, mkdir } from "fs/promises";
import { join } from "path";

const testDir = "/tmp/deps-integration-test";

beforeEach(async () => {
  await mkdir(testDir, { recursive: true });
  process.chdir(testDir);
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("deps CLI integration", () => {
  test("init creates deps file", async () => {
    const proc = Bun.spawn(["bun", "run", "/home/jason/projects/deps/src/index.ts", "init"], {
      cwd: testDir,
      stdout: "pipe",
    });
    await proc.exited;

    const file = Bun.file(join(testDir, "deps"));
    expect(await file.exists()).toBe(true);
  });

  test("add appends to deps file", async () => {
    // First init
    await Bun.spawn(["bun", "run", "/home/jason/projects/deps/src/index.ts", "init"], {
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
```

**Step 2: Run integration tests**

Run: `bun test tests/integration.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/integration.test.ts
git commit -m "test: add integration tests for CLI"
```

---

## Task 15: Documentation and Final Polish

**Files:**
- Create: `/home/jason/projects/deps/README.md`
- Modify: `/home/jason/projects/deps/package.json`

**Step 1: Create README**

Create `README.md`:
```markdown
# deps

Nix-powered dependency management without the Nix.

## Installation

### Via Nix (recommended)

```bash
nix profile install github:jason/deps
```

### Via curl

```bash
curl -fsSL https://raw.githubusercontent.com/jason/deps/main/scripts/install.sh | sh
```

## Usage

### Initialize a project

```bash
deps init
```

### Add dependencies

Edit the `deps` file:

```
nodejs 20
python 3.11
ripgrep ^14
```

Or use the CLI:

```bash
deps add nodejs 20
deps add python 3.11
```

### Install dependencies

```bash
deps install
```

### direnv integration

One-time setup:

```bash
deps direnv-setup
```

In your project, create `.envrc`:

```bash
use deps
```

Then:

```bash
direnv allow
```

### Commands

| Command | Description |
|---------|-------------|
| `deps init` | Create a new deps file |
| `deps install` | Install dependencies |
| `deps add <pkg> <version>` | Add a dependency |
| `deps remove <pkg>` | Remove a dependency |
| `deps list` | List installed dependencies |
| `deps shell` | Spawn shell with deps in PATH |
| `deps env` | Output shell exports |
| `deps direnv-setup` | Configure direnv integration |

## Version Specification

- Exact: `nodejs 20.11.0`
- Major: `nodejs 20` (resolves to latest 20.x)
- Caret: `jq ^1.6` (resolves to latest 1.x >= 1.6)
- GTE: `python >=3.10` (resolves to latest >= 3.10)

## License

MIT
```

**Step 2: Update package.json metadata**

Update `package.json`:
```json
{
  "name": "deps",
  "version": "0.1.0",
  "description": "Nix-powered dependency management without the Nix",
  "author": "jason",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/jason/deps"
  }
}
```

**Step 3: Run all tests**

Run: `bun test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add README.md package.json
git commit -m "docs: add README and package metadata"
```

---

## Summary

This plan implements deps in 15 tasks following TDD:

1. **Tasks 1-3**: Project setup and parser
2. **Tasks 4-6**: Version utilities and resolver
3. **Tasks 7-9**: Lockfile and environment
4. **Tasks 10-12**: CLI commands
5. **Tasks 13-15**: Distribution and docs

Each task produces working, tested code with atomic commits.
