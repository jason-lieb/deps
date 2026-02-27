// Static import so Bun embeds the JSON in compiled executable
import nixVersionsData from "../data/nix-versions.json";

export interface VersionEntry {
  commit: string;
  attr: string;
}

export interface NixVersionsIndex {
  version: number;
  lastUpdated: string;
  packages: Record<string, Record<string, VersionEntry>>;
}

const cachedIndex: NixVersionsIndex = nixVersionsData as NixVersionsIndex;

export async function loadIndex(): Promise<NixVersionsIndex> {
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
