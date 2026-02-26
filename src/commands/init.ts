import { join } from "path";
import { registerCommand } from "../cli";

const TEMPLATE = `# deps - list your dependencies below
# Format: name version
# Examples:
#   nodejs 20
#   python 3.11
#   ripgrep ^14
`;

registerCommand({
  name: "init",
  description: "Create a new deps file",
  run: async (_args) => {
    const cwd = process.cwd();
    const depsPath = join(cwd, "deps");

    const file = Bun.file(depsPath);
    if (await file.exists()) {
      console.error("deps file already exists");
      return 1;
    }

    await Bun.write(depsPath, TEMPLATE);
    console.log("Created deps file");
    return 0;
  },
});
