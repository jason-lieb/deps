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
