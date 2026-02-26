export interface Dependency {
  name: string;
  version: string;
  raw: string;
  line: number;
}

export interface ResolvedDependency {
  name: string;
  requestedVersion: string;
  resolvedVersion: string;
  nixpkgsCommit: string;
  attr: string;
  storePath: string;
}

export interface Lockfile {
  version: number;
  hash: string;
  resolved: Record<string, ResolvedDependency>;
}
