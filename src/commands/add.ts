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
