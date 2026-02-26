import type { Dependency } from "./types";

export function parseDepsFile(content: string): Dependency[] {
  const lines = content.split("\n");
  const deps: Dependency[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    // Skip empty lines and comments
    if (!line || line.startsWith("#")) {
      continue;
    }

    // Split on first space
    const spaceIndex = line.indexOf(" ");
    if (spaceIndex === -1) {
      throw new Error(`Invalid dependency format at line ${lineNum}: "${line}". Expected "name version"`);
    }

    const name = line.slice(0, spaceIndex);
    const version = line.slice(spaceIndex + 1).trim();

    if (!name || !version) {
      throw new Error(`Invalid dependency format at line ${lineNum}: "${line}". Expected "name version"`);
    }

    deps.push({ name, version, raw: line, line: lineNum });
  }

  return deps;
}
