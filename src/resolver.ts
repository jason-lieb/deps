import type { Dependency, ResolvedDependency } from "./types";
import { loadIndex, lookupVersions, lookupVersionEntry } from "./index-loader";
import { parseVersion, findBestMatch } from "./version";

export async function resolveDependency(dep: Dependency): Promise<ResolvedDependency> {
  const index = await loadIndex();
  const availableVersions = lookupVersions(index, dep.name);

  if (availableVersions.length === 0) {
    throw new Error(`Package "${dep.name}" not found in index`);
  }

  const spec = parseVersion(dep.version);
  const matchedVersion = findBestMatch(availableVersions, spec);

  if (!matchedVersion) {
    const available = availableVersions.slice(0, 5).join(", ");
    throw new Error(
      `Version "${dep.version}" for "${dep.name}" not found. Available: ${available}`
    );
  }

  const entry = lookupVersionEntry(index, dep.name, matchedVersion)!;

  return {
    name: dep.name,
    requestedVersion: dep.version,
    resolvedVersion: matchedVersion,
    nixpkgsCommit: entry.commit,
    attr: entry.attr,
    storePath: "", // Will be filled after installation
  };
}

export async function resolveDependencies(deps: Dependency[]): Promise<ResolvedDependency[]> {
  const results: ResolvedDependency[] = [];
  for (const dep of deps) {
    const resolved = await resolveDependency(dep);
    results.push(resolved);
  }
  return results;
}
