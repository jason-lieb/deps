import { join } from "path";
import { registerCommand } from "../cli";

registerCommand({
  name: "remove",
  description: "Remove a dependency",
  run: async (args) => {
    if (args.length < 1) {
      console.error("Usage: deps remove <package>");
      return 1;
    }

    const name = args[0];
    const cwd = process.cwd();
    const depsPath = join(cwd, "deps");

    const file = Bun.file(depsPath);
    if (!(await file.exists())) {
      console.error("No deps file found.");
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
    console.log(`Removed ${name}`);
    return 0;
  },
});
