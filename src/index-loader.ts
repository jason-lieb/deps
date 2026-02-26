import { join, dirname } from "path";
import { fileURLToPath } from "url";

export interface VersionEntry {
  commit: string;
  attr: string;
}

export interface NixVersionsIndex {
  version: number;
  lastUpdated: string;
  packages: Record<string, Record<string, VersionEntry>>;
}

let cachedIndex: NixVersionsIndex | null = null;

export async function loadIndex(): Promise<NixVersionsIndex> {
  if (cachedIndex) return cachedIndex;

  // Resolve path relative to this file
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);
  const indexPath = join(currentDir, "..", "data", "nix-versions.json");

  const file = Bun.file(indexPath);
  const content = await file.json();
  cachedIndex = content as NixVersionsIndex;
  return cachedIndex;
}

export function lookupVersions(index: NixVersionsIndex, packageName: string): string[] {
  const pkg = index.packages[packageName];
  if (!pkg) return [];
  return Object.keys(pkg);
}

export function lookupVersionEntry(
  index: NixVersionsIndex,
  packageName: string,
  version: string
): VersionEntry | null {
  const pkg = index.packages[packageName];
  if (!pkg) return null;
  return pkg[version] || null;
}
