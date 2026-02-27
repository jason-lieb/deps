import { join } from "path";
import { homedir } from "os";
import { mkdir } from "fs/promises";

export function getGlobalDepsDir(): string {
  return join(homedir(), ".config", "deps");
}

export function getGlobalDepsPath(): string {
  return join(getGlobalDepsDir(), "deps");
}

export function getGlobalLockfilePath(): string {
  return join(getGlobalDepsDir(), "deps.lock");
}

export async function ensureGlobalDepsDir(): Promise<void> {
  await mkdir(getGlobalDepsDir(), { recursive: true });
}
