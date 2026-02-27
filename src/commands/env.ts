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
