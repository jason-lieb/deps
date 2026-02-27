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
