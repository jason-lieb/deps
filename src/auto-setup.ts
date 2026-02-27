import { join } from "path";
import { homedir } from "os";
import { $ } from "bun";

const DIRENV_FUNCTION = `
# deps - Nix-powered dependency management
use_deps() {
  watch_file deps
  watch_file deps.lock
  eval "$(deps env)"
}
`;

export async function autoSetupDirenv(): Promise<void> {
  // Check if direnv is installed
  const result = await $`which direnv`.quiet().nothrow();
  if (result.exitCode !== 0) {
    return; // direnv not installed, skip
  }

  const direnvrcPath = join(homedir(), ".direnvrc");
  const file = Bun.file(direnvrcPath);

  let content = "";
  if (await file.exists()) {
    content = await file.text();
  }

  if (content.includes("use_deps")) {
    return; // Already configured
  }

  content = content.trimEnd() + "\n" + DIRENV_FUNCTION;
  await Bun.write(direnvrcPath, content);

  console.error("deps: Added use_deps function to ~/.direnvrc");
}
