import { join } from "path";
import { homedir } from "os";
import { registerCommand } from "../cli";

const DIRENV_FUNCTION = `
# deps - Nix-powered dependency management
use_deps() {
  watch_file deps
  watch_file deps.lock
  eval "$(deps env)"
}
`;

registerCommand({
  name: "direnv-setup",
  description: "Add use_deps function to ~/.direnvrc",
  run: async (_args) => {
    const direnvrcPath = join(homedir(), ".direnvrc");
    const file = Bun.file(direnvrcPath);

    let content = "";
    if (await file.exists()) {
      content = await file.text();
    }

    if (content.includes("use_deps")) {
      console.log("use_deps already configured in ~/.direnvrc");
      return 0;
    }

    content = content.trimEnd() + "\n" + DIRENV_FUNCTION;
    await Bun.write(direnvrcPath, content);

    console.log("Added use_deps function to ~/.direnvrc");
    console.log("\nTo use in a project, create .envrc with:");
    console.log("  use deps");
    return 0;
  },
});
