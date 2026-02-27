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
