export type VersionSpec =
  | { type: "exact"; value: string }
  | { type: "major"; value: string }
  | { type: "caret"; value: string }
  | { type: "gte"; value: string };

export function parseVersion(version: string): VersionSpec {
  if (version.startsWith("^")) {
    return { type: "caret", value: version.slice(1) };
  }
  if (version.startsWith(">=")) {
    return { type: "gte", value: version.slice(2) };
  }
  // Check if it's just a major version (single number)
  if (/^\d+$/.test(version)) {
    return { type: "major", value: version };
  }
  return { type: "exact", value: version };
}

function parseVersionParts(version: string): number[] {
  return version.split(".").map((p) => parseInt(p, 10) || 0);
}

function compareVersions(a: string, b: string): number {
  const partsA = parseVersionParts(a);
  const partsB = parseVersionParts(b);
  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) {
      return numA - numB;
    }
  }
  return 0;
}

export function matchesVersion(candidate: string, spec: VersionSpec): boolean {
  const candidateParts = parseVersionParts(candidate);
  const specParts = parseVersionParts(spec.value);

  switch (spec.type) {
    case "exact":
      return candidate === spec.value;

    case "major":
      return candidateParts[0] === specParts[0];

    case "caret":
      // ^1.6 means >=1.6.0 and <2.0.0
      if (candidateParts[0] !== specParts[0]) {
        return false;
      }
      return compareVersions(candidate, spec.value) >= 0;

    case "gte":
      return compareVersions(candidate, spec.value) >= 0;
  }
}

export function findBestMatch(candidates: string[], spec: VersionSpec): string | null {
  const matches = candidates.filter((c) => matchesVersion(c, spec));
  if (matches.length === 0) return null;
  // Sort descending and return highest
  return matches.sort((a, b) => compareVersions(b, a))[0];
}
