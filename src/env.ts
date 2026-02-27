import type { Lockfile } from "./types";

export function getBinPaths(lockfile: Lockfile): string[] {
  const paths: string[] = [];

  for (const key of Object.keys(lockfile.resolved)) {
    const dep = lockfile.resolved[key];
    if (dep.storePath) {
      paths.push(`${dep.storePath}/bin`);
    }
  }

  return paths;
}

export function mergeBinPaths(globalPaths: string[], localPaths: string[]): string[] {
  // Local paths first (higher precedence)
  return [...localPaths, ...globalPaths];
}

export function generateEnvExports(lockfile: Lockfile): string {
  const binPaths = getBinPaths(lockfile);

  if (binPaths.length === 0) {
    return "";
  }

  const pathValue = binPaths.join(":") + ":$PATH";
  return `export PATH="${pathValue}"`;
}
