# API Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify deps CLI by removing shell/install commands, binary installation, and adding global deps with auto-install.

**Architecture:** Remove redundant commands (shell, install). Extract install logic into `ensureInstalled()` helper. Add `src/paths.ts` for global deps paths. Modify add/remove/list/env to support `-g` flag.

**Tech Stack:** TypeScript, Bun, Nix

---

## Task 1: Remove shell command

**Files:**
- Delete: `src/commands/shell.ts`
- Modify: `src/index.ts:11` (remove import)

**Step 1: Delete shell.ts**

```bash
rm src/commands/shell.ts
```

**Step 2: Remove import from index.ts**

In `src/index.ts`, remove line 11:
```typescript
import "./commands/shell";
```

**Step 3: Run tests to verify nothing breaks**

Run: `bun test`
Expected: All tests pass (shell command had no dedicated tests)

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove shell command

Replaced by direnv integration via deps env."
```

---

## Task 2: Create ensureInstalled helper

**Files:**
- Modify: `src/installer.ts` (add function)
- Create: `tests/installer.test.ts` (add test)

**Step 1: Write the failing test**

Add to end of `tests/installer.test.ts`:

```typescript
import { ensureInstalled } from "../src/installer";

describe("ensureInstalled", () => {
  test("returns null when no deps file exists", async () => {
    const result = await ensureInstalled("/nonexistent/path");
    expect(result).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/installer.test.ts`
Expected: FAIL with "ensureInstalled is not exported"

**Step 3: Write minimal implementation**

Add to `src/installer.ts`:

```typescript
import { parseDepsFile } from "./parser";
import { resolveDependencies } from "./resolver";
import { writeLockfile, readLockfile, isLockfileStale } from "./lockfile";
import type { Lockfile } from "./types";

export async function ensureInstalled(dir: string): Promise<Lockfile | null> {
  const depsPath = join(dir, "deps");
  const file = Bun.file(depsPath);

  if (!(await file.exists())) {
    return null;
  }

  const content = await file.text();
  const deps = parseDepsFile(content);

  if (deps.length === 0) {
    return null;
  }

  const stale = await isLockfileStale(dir, content);
  if (!stale) {
    return await readLockfile(dir);
  }

  console.log(`Resolving ${deps.length} dependencies...`);
  const resolved = await resolveDependencies(deps);

  console.log(`Installing dependencies...`);
  const installed = await installAll(dir, resolved);

  const resolvedMap: Record<string, ResolvedDependency> = {};
  for (const dep of installed) {
    resolvedMap[`${dep.name} ${dep.requestedVersion}`] = dep;
  }

  await writeLockfile(dir, content, resolvedMap);
  console.log("Dependencies installed successfully.");

  return await readLockfile(dir);
}
```

**Step 4: Run test to verify it passes**

Run: `bun test tests/installer.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/installer.ts tests/installer.test.ts
git commit -m "feat: add ensureInstalled helper for auto-install"
```

---

## Task 3: Remove install command and update add/env

**Files:**
- Delete: `src/commands/install.ts`
- Modify: `src/index.ts:7` (remove import)
- Modify: `src/commands/add.ts`
- Modify: `src/commands/env.ts`

**Step 1: Update add.ts to use ensureInstalled**

Replace `src/commands/add.ts` with:

```typescript
import { join } from "path";
import { registerCommand } from "../cli";
import { ensureInstalled } from "../installer";

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

    await ensureInstalled(cwd);
    return 0;
  },
});
```

**Step 2: Update env.ts to use ensureInstalled**

Replace `src/commands/env.ts` with:

```typescript
import { registerCommand } from "../cli";
import { readLockfile } from "../lockfile";
import { generateEnvExports } from "../env";
import { ensureInstalled } from "../installer";

registerCommand({
  name: "env",
  description: "Output shell exports (for direnv)",
  run: async (_args) => {
    const cwd = process.cwd();

    await ensureInstalled(cwd);

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

**Step 3: Delete install.ts and remove import**

```bash
rm src/commands/install.ts
```

In `src/index.ts`, remove line 7:
```typescript
import "./commands/install";
```

**Step 4: Run tests**

Run: `bun test`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove install command, use auto-install

deps add and deps env now auto-install when deps file changes."
```

---

## Task 4: Remove binary installation scripts

**Files:**
- Delete: `scripts/install.sh`
- Modify: `package.json` (remove build scripts)
- Modify: `README.md` (remove curl installation)

**Step 1: Delete install script**

```bash
rm scripts/install.sh
rmdir scripts 2>/dev/null || true
```

**Step 2: Update package.json**

Remove build scripts. Keep only:

```json
{
  "scripts": {
    "dev": "bun run src/index.ts",
    "test": "bun test",
    "build": "bun build --compile --outfile=dist/deps src/index.ts"
  }
}
```

**Step 3: Update README.md installation section**

Replace the Installation section with:

```markdown
## Installation

```bash
nix profile install github:jason/deps
```
```

**Step 4: Update README.md commands table**

Remove `deps install` and `deps shell` rows:

```markdown
| Command | Description |
|---------|-------------|
| `deps init` | Create a new deps file |
| `deps add <pkg> <version>` | Add a dependency |
| `deps remove <pkg>` | Remove a dependency |
| `deps list` | List installed dependencies |
| `deps env` | Output shell exports |
| `deps direnv-setup` | Configure direnv integration |
```

**Step 5: Run tests**

Run: `bun test`
Expected: PASS

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove binary installation method

deps now only installable via nix."
```

---

## Task 5: Add paths.ts helper module

**Files:**
- Create: `src/paths.ts`
- Create: `tests/paths.test.ts`

**Step 1: Write the failing test**

Create `tests/paths.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/paths.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `src/paths.ts`:

```typescript
import { join } from "path";
import { homedir } from "os";
import { mkdir } from "fs/promises";

export function getGlobalDepsDir(): string {
  return join(homedir(), ".config", "deps");
}

export function getGlobalDepsPath(): string {
  return join(getGlobalDepsDir(), "deps");
}

export function getGlobalLockfilePath(): string {
  return join(getGlobalDepsDir(), "deps.lock");
}

export async function ensureGlobalDepsDir(): Promise<void> {
  await mkdir(getGlobalDepsDir(), { recursive: true });
}
```

**Step 4: Run test to verify it passes**

Run: `bun test tests/paths.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/paths.ts tests/paths.test.ts
git commit -m "feat: add paths.ts helper for global deps location"
```

---

## Task 6: Add -g flag to add command

**Files:**
- Modify: `src/commands/add.ts`

**Step 1: Update add.ts with -g flag support**

Replace `src/commands/add.ts` with:

```typescript
import { join } from "path";
import { registerCommand } from "../cli";
import { ensureInstalled } from "../installer";
import { getGlobalDepsPath, ensureGlobalDepsDir, getGlobalDepsDir } from "../paths";

function parseArgs(args: string[]): { global: boolean; rest: string[] } {
  const global = args[0] === "-g" || args[0] === "--global";
  const rest = global ? args.slice(1) : args;
  return { global, rest };
}

registerCommand({
  name: "add",
  description: "Add a dependency",
  run: async (args) => {
    const { global, rest } = parseArgs(args);

    if (rest.length < 2) {
      console.error("Usage: deps add [-g] <package> <version>");
      return 1;
    }

    const [name, version] = rest;
    let depsPath: string;
    let installDir: string;

    if (global) {
      await ensureGlobalDepsDir();
      depsPath = getGlobalDepsPath();
      installDir = getGlobalDepsDir();
    } else {
      depsPath = join(process.cwd(), "deps");
      installDir = process.cwd();
    }

    const file = Bun.file(depsPath);
    let content = "";

    if (await file.exists()) {
      content = await file.text();
    }

    const lines = content.split("\n");
    const existing = lines.findIndex((l) => l.trim().startsWith(name + " "));
    if (existing !== -1) {
      lines[existing] = `${name} ${version}`;
      content = lines.join("\n");
    } else {
      content = content.trimEnd() + `\n${name} ${version}\n`;
    }

    await Bun.write(depsPath, content);
    console.log(`Added ${name} ${version}${global ? " (global)" : ""}`);

    await ensureInstalled(installDir);
    return 0;
  },
});
```

**Step 2: Run tests**

Run: `bun test`
Expected: PASS

**Step 3: Commit**

```bash
git add src/commands/add.ts
git commit -m "feat: add -g flag to deps add for global deps"
```

---

## Task 7: Add -g flag to remove command

**Files:**
- Modify: `src/commands/remove.ts`

**Step 1: Update remove.ts with -g flag support**

Replace `src/commands/remove.ts` with:

```typescript
import { join } from "path";
import { registerCommand } from "../cli";
import { getGlobalDepsPath } from "../paths";

function parseArgs(args: string[]): { global: boolean; rest: string[] } {
  const global = args[0] === "-g" || args[0] === "--global";
  const rest = global ? args.slice(1) : args;
  return { global, rest };
}

registerCommand({
  name: "remove",
  description: "Remove a dependency",
  run: async (args) => {
    const { global, rest } = parseArgs(args);

    if (rest.length < 1) {
      console.error("Usage: deps remove [-g] <package>");
      return 1;
    }

    const name = rest[0];
    const depsPath = global ? getGlobalDepsPath() : join(process.cwd(), "deps");

    const file = Bun.file(depsPath);
    if (!(await file.exists())) {
      console.error(global ? "No global deps file found." : "No deps file found.");
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
    console.log(`Removed ${name}${global ? " (global)" : ""}`);
    return 0;
  },
});
```

**Step 2: Run tests**

Run: `bun test`
Expected: PASS

**Step 3: Commit**

```bash
git add src/commands/remove.ts
git commit -m "feat: add -g flag to deps remove for global deps"
```

---

## Task 8: Add -g and --all flags to list command

**Files:**
- Modify: `src/commands/list.ts`

**Step 1: Update list.ts with flag support**

Replace `src/commands/list.ts` with:

```typescript
import { registerCommand } from "../cli";
import { readLockfile } from "../lockfile";
import { getGlobalDepsDir } from "../paths";
import type { Lockfile } from "../types";

function parseArgs(args: string[]): { global: boolean; all: boolean } {
  const global = args.includes("-g") || args.includes("--global");
  const all = args.includes("--all");
  return { global, all };
}

function printDeps(lockfile: Lockfile | null, label?: string): void {
  if (!lockfile || Object.keys(lockfile.resolved).length === 0) {
    if (label) {
      console.log(`${label}: (none)`);
    }
    return;
  }

  if (label) {
    console.log(`${label}:`);
  }

  for (const key of Object.keys(lockfile.resolved)) {
    const dep = lockfile.resolved[key];
    console.log(`  ${dep.name} ${dep.resolvedVersion} (requested: ${dep.requestedVersion})`);
  }
}

registerCommand({
  name: "list",
  description: "List installed dependencies",
  run: async (args) => {
    const { global, all } = parseArgs(args);

    if (all) {
      const globalLockfile = await readLockfile(getGlobalDepsDir());
      const localLockfile = await readLockfile(process.cwd());

      printDeps(globalLockfile, "Global");
      console.log("");
      printDeps(localLockfile, "Local");
      return 0;
    }

    const dir = global ? getGlobalDepsDir() : process.cwd();
    const lockfile = await readLockfile(dir);

    if (!lockfile || Object.keys(lockfile.resolved).length === 0) {
      console.log("No dependencies installed.");
      return 0;
    }

    console.log("Installed dependencies:\n");
    printDeps(lockfile);
    return 0;
  },
});
```

**Step 2: Run tests**

Run: `bun test`
Expected: PASS

**Step 3: Commit**

```bash
git add src/commands/list.ts
git commit -m "feat: add -g and --all flags to deps list"
```

---

## Task 9: Add --global flag and merge to env command

**Files:**
- Modify: `src/commands/env.ts`
- Modify: `src/env.ts` (add merge function)

**Step 1: Add mergeBinPaths to env.ts**

Add to `src/env.ts`:

```typescript
export function mergeBinPaths(globalPaths: string[], localPaths: string[]): string[] {
  // Local paths first (higher precedence)
  return [...localPaths, ...globalPaths];
}
```

**Step 2: Update env command with --global and merge**

Replace `src/commands/env.ts` with:

```typescript
import { registerCommand } from "../cli";
import { readLockfile } from "../lockfile";
import { getBinPaths, mergeBinPaths } from "../env";
import { ensureInstalled } from "../installer";
import { getGlobalDepsDir } from "../paths";

function parseArgs(args: string[]): { globalOnly: boolean } {
  const globalOnly = args.includes("--global");
  return { globalOnly };
}

registerCommand({
  name: "env",
  description: "Output shell exports (for direnv)",
  run: async (args) => {
    const { globalOnly } = parseArgs(args);
    const cwd = process.cwd();
    const globalDir = getGlobalDepsDir();

    // Always try to install global deps if needed
    await ensureInstalled(globalDir);

    if (globalOnly) {
      const lockfile = await readLockfile(globalDir);
      if (!lockfile) return 0;

      const paths = getBinPaths(lockfile);
      if (paths.length > 0) {
        console.log(`export PATH="${paths.join(":")}:$PATH"`);
      }
      return 0;
    }

    // Install local deps if needed
    await ensureInstalled(cwd);

    // Merge global and local
    const globalLockfile = await readLockfile(globalDir);
    const localLockfile = await readLockfile(cwd);

    const globalPaths = globalLockfile ? getBinPaths(globalLockfile) : [];
    const localPaths = localLockfile ? getBinPaths(localLockfile) : [];

    const mergedPaths = mergeBinPaths(globalPaths, localPaths);

    if (mergedPaths.length > 0) {
      console.log(`export PATH="${mergedPaths.join(":")}:$PATH"`);
    }
    return 0;
  },
});
```

**Step 3: Run tests**

Run: `bun test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/env.ts src/commands/env.ts
git commit -m "feat: add --global flag and path merging to deps env"
```

---

## Task 10: Update README with global deps documentation

**Files:**
- Modify: `README.md`

**Step 1: Update README**

Add Global Dependencies section and update commands table:

```markdown
## Commands

| Command | Description |
|---------|-------------|
| `deps init` | Create a new deps file |
| `deps add [-g] <pkg> <version>` | Add a dependency (-g for global) |
| `deps remove [-g] <pkg>` | Remove a dependency |
| `deps list [-g \| --all]` | List dependencies |
| `deps env [--global]` | Output shell exports |
| `deps direnv-setup` | Configure direnv integration |

## Global Dependencies

Global dependencies are available in all shell sessions. They're stored in `~/.config/deps/`.

### Add global dependencies

```bash
deps add -g ripgrep 14
deps add -g jq 1.7
```

### List global and local deps

```bash
deps list -g        # Global only
deps list --all     # Both
```

### How it works

- `deps env` merges global and local deps (local takes precedence)
- `deps env --global` outputs only global deps
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add global deps documentation to README"
```

---

## Task 11: Delete old plan and final cleanup

**Files:**
- Delete: `PLAN-global-deps.md`

**Step 1: Delete old plan**

```bash
rm PLAN-global-deps.md
```

**Step 2: Run all tests**

Run: `bun test`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove superseded global deps plan"
```

---

## Summary

After completing all tasks:

**Removed:**
- `deps install` command
- `deps shell` command
- `scripts/install.sh`
- Cross-platform build scripts

**Added:**
- Auto-install via `ensureInstalled()` in add/env
- `src/paths.ts` for global deps paths
- `-g` flag on add/remove/list
- `--global` flag and path merging on env
- Global deps docs in README
