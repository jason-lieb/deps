import { join } from "path";
import { homedir } from "os";
import { mkdir } from "fs/promises";
import { registerCommand } from "../cli";

const DIRENV_FUNCTION = `# deps - Nix-powered dependency management
use_deps() {
  watch_file deps
  watch_file deps.lock
  eval "$(deps env)"
}
`;

registerCommand({
  name: "direnv-setup",
  description: "Add use_deps function to direnv",
  run: async (_args) => {
    const libDir = join(homedir(), ".config/direnv/lib");
    const libPath = join(libDir, "use_deps.sh");
    const file = Bun.file(libPath);

    if (await file.exists()) {
      console.log("use_deps already configured in ~/.config/direnv/lib/use_deps.sh");
      return 0;
    }

    await mkdir(libDir, { recursive: true });
    await Bun.write(libPath, DIRENV_FUNCTION);

    console.log("Created ~/.config/direnv/lib/use_deps.sh");
    console.log("\nTo use in a project, create .envrc with:");
    console.log("  use deps");
    return 0;
  },
});
