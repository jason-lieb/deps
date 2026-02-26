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
