import { join } from "path";
import { homedir } from "os";
import type { ResolvedDependency, Lockfile } from "./types";
import { parseDepsFile } from "./parser";
import { resolveDependencies } from "./resolver";
import { writeLockfile, readLockfile, isLockfileStale } from "./lockfile";

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export function getProfilePath(projectDir: string): string {
  const hash = hashString(projectDir);
  return join(homedir(), ".local", "state", "deps", "profiles", hash);
}

export function buildNixInstallCommand(
  profilePath: string,
  nixpkgsCommit: string,
  attr: string
): string {
  return `nix profile install --profile "${profilePath}" "github:NixOS/nixpkgs/${nixpkgsCommit}#${attr}"`;
}

export async function ensureProfileDir(profilePath: string): Promise<void> {
  const { mkdir } = await import("fs/promises");
  const dir = join(profilePath, "..");
  await mkdir(dir, { recursive: true });
}

export async function installDependency(
  projectDir: string,
  dep: ResolvedDependency
): Promise<string> {
  const profilePath = getProfilePath(projectDir);
  await ensureProfileDir(profilePath);

  const cmd = buildNixInstallCommand(profilePath, dep.nixpkgsCommit, dep.attr);

  const proc = Bun.spawn(["bash", "-c", cmd], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Failed to install ${dep.name}: ${stderr}`);
  }

  // Get the store path from the profile
  const storePath = await getStorePathFromProfile(profilePath, dep.attr);
  return storePath;
}

async function getStorePathFromProfile(profilePath: string, attr: string): Promise<string> {
  const proc = Bun.spawn(["bash", "-c", `nix profile list --profile "${profilePath}" --json`], {
    stdout: "pipe",
    stderr: "pipe",
  });

  await proc.exited;
  const stdout = await new Response(proc.stdout).text();

  try {
    const profile = JSON.parse(stdout);
    // Find the entry matching our attr
    for (const element of profile.elements || []) {
      if (element.attrPath?.includes(attr) || element.storePaths?.[0]?.includes(attr)) {
        return element.storePaths?.[0] || "";
      }
    }
  } catch {
    // Fall back to empty - will be populated on next run
  }

  return "";
}

export async function installAll(
  projectDir: string,
  deps: ResolvedDependency[]
): Promise<ResolvedDependency[]> {
  const results: ResolvedDependency[] = [];

  for (const dep of deps) {
    console.log(`Installing ${dep.name}@${dep.resolvedVersion}...`);
    const storePath = await installDependency(projectDir, dep);
    results.push({ ...dep, storePath });
  }

  return results;
}

export async function ensureInstalled(dir: string): Promise<Lockfile | null> {
  const depsPath = join(dir, "deps");
  const file = Bun.file(depsPath);

  if (!(await file.exists())) {
    return null;
  }

  const content = await file.text();
  const deps = parseDepsFile(content);

  if (deps.length === 0) {
    return null;
  }

  const stale = await isLockfileStale(dir, content);
  if (!stale) {
    return await readLockfile(dir);
  }

  console.log(`Resolving ${deps.length} dependencies...`);
  const resolved = await resolveDependencies(deps);

  console.log(`Installing dependencies...`);
  const installed = await installAll(dir, resolved);

  const resolvedMap: Record<string, ResolvedDependency> = {};
  for (const dep of installed) {
    resolvedMap[`${dep.name} ${dep.requestedVersion}`] = dep;
  }

  await writeLockfile(dir, content, resolvedMap);
  console.log("Dependencies installed successfully.");

  return await readLockfile(dir);
}
