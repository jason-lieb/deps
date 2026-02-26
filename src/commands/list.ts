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
