import { join } from "path";
import type { Lockfile, ResolvedDependency } from "./types";

const LOCKFILE_NAME = "deps.lock";

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function readLockfile(dir: string): Promise<Lockfile | null> {
  const path = join(dir, LOCKFILE_NAME);
  const file = Bun.file(path);

  if (!(await file.exists())) {
    return null;
  }

  try {
    return (await file.json()) as Lockfile;
  } catch {
    return null;
  }
}

export async function writeLockfile(
  dir: string,
  depsContent: string,
  resolved: Record<string, ResolvedDependency>
): Promise<void> {
  const hash = await hashContent(depsContent);
  const lockfile: Lockfile = {
    version: 1,
    hash,
    resolved,
  };

  const path = join(dir, LOCKFILE_NAME);
  await Bun.write(path, JSON.stringify(lockfile, null, 2) + "\n");
}

export async function isLockfileStale(dir: string, currentDepsContent: string): Promise<boolean> {
  const lockfile = await readLockfile(dir);
  if (!lockfile) return true;

  const currentHash = await hashContent(currentDepsContent);
  return lockfile.hash !== currentHash;
}
