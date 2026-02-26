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
