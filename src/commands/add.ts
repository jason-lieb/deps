import { join } from "path";
import { registerCommand } from "../cli";

registerCommand({
  name: "add",
  description: "Add a dependency",
  run: async (args) => {
    if (args.length < 2) {
      console.error("Usage: deps add <package> <version>");
      return 1;
    }

    const [name, version] = args;
    const cwd = process.cwd();
    const depsPath = join(cwd, "deps");

    const file = Bun.file(depsPath);
    let content = "";

    if (await file.exists()) {
      content = await file.text();
    }

    // Check if already exists
    const lines = content.split("\n");
    const existing = lines.findIndex((l) => l.trim().startsWith(name + " "));
    if (existing !== -1) {
      lines[existing] = `${name} ${version}`;
      content = lines.join("\n");
    } else {
      content = content.trimEnd() + `\n${name} ${version}\n`;
    }

    await Bun.write(depsPath, content);
    console.log(`Added ${name} ${version}`);

    // Run install
    const { getCommand } = await import("../cli");
    const installCmd = getCommand("install");
    if (installCmd) {
      return installCmd.run([]);
    }
    return 0;
  },
});
