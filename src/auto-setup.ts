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

async function autoSetupPath(): Promise<void> {
  const home = homedir();
  const localBin = join(home, ".local/bin");
  const symlinkPath = join(localBin, "deps");
  const depsSource = join(home, ".nix-profile/bin/deps");

  // Check if symlink already exists
  const symlinkFile = Bun.file(symlinkPath);
  if (await symlinkFile.exists()) {
    return;
  }

  // Check if source exists
  const sourceFile = Bun.file(depsSource);
  if (!(await sourceFile.exists())) {
    return;
  }

  // Create ~/.local/bin if needed
  await $`mkdir -p ${localBin}`.quiet().nothrow();

  // Create symlink
  await $`ln -sf ${depsSource} ${symlinkPath}`.quiet().nothrow();

  console.error("deps: Created symlink at ~/.local/bin/deps");
}

async function autoSetupDirenv(): Promise<void> {
  // Check if direnv is installed
  const result = await $`which direnv`.quiet().nothrow();
  if (result.exitCode !== 0) {
    return;
  }

  const home = homedir();
  const libDir = join(home, ".config/direnv/lib");
  const libPath = join(libDir, "use_deps.sh");
  const file = Bun.file(libPath);

  if (await file.exists()) {
    return;
  }

  await $`mkdir -p ${libDir}`.quiet().nothrow();
  await Bun.write(libPath, DIRENV_FUNCTION.trim() + "\n");

  console.error("deps: Created ~/.config/direnv/lib/use_deps.sh");
}

export async function autoSetup(): Promise<void> {
  await autoSetupPath();
  await autoSetupDirenv();
}
