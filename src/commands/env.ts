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
