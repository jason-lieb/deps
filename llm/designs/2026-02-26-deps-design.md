# deps: Nix-powered dependency management without the Nix

## Overview

deps is a CLI tool that provides nvm-like version management for any dependency, powered by Nix under the hood. Users specify dependencies in a simple text file, and deps handles resolution, installation, and shell integration without requiring Nix knowledge beyond having it installed.

## Goals

- Simple plain-text dependency specification
- Support exact versions and version ranges
- nvm-like experience: request any version, it just works
- direnv integration via `use deps`
- No Nix configuration required from users
- Cross-platform: Ubuntu and macOS

## File Format

### deps file

Plain text, one dependency per line:

```
# Comments start with #
nodejs 20
python 3.11.0
ripgrep 14
jq ^1.6
```

Rules:
- Format: `name version` (space-separated)
- Version can be exact (`20.11.0`), major (`20`), or range (`^1.6`, `>=3.10`)
- Package names match nixpkgs attribute names
- Lines starting with `#` are comments
- Empty lines ignored

### deps.lock

Generated JSON storing resolved versions:

```json
{
  "version": 1,
  "hash": "sha256-...",
  "resolved": {
    "nodejs 20": {
      "nixpkgs": "github:NixOS/nixpkgs/abc123",
      "attr": "nodejs_20",
      "version": "20.11.0",
      "storePath": "/nix/store/xxx-nodejs-20.11.0"
    }
  }
}
```

## Architecture

### Components

1. **Parser** (`src/parser.ts`) - Reads deps file, extracts name/version pairs, validates syntax
2. **Resolver** (`src/resolver.ts`) - Resolves versions to nixpkgs commits using nix-versions index
3. **Installer** (`src/installer.ts`) - Executes `nix profile install` for resolved packages
4. **Environment** (`src/env.ts`) - Outputs shell environment from lockfile
5. **CLI** (`src/cli.ts`) - Command routing and entry point

### Data Flow

```
deps file → Parser → Resolver → deps.lock → Installer → nix profile
                                    ↓
                              Environment → PATH/shell
```

### Nix Integration

- Uses `nix profile install` for package management
- Per-project profiles stored in `~/.local/state/deps/profiles/<project-hash>`
- Leverages nix store directly for caching

## Version Resolution

### Index Source

- Bundle snapshot of lazamar/nix-versions data with releases
- Maps package versions to nixpkgs commits
- Optional `deps update-index` to fetch fresh data

### Resolution Algorithm

1. Exact version (`nodejs 20.11.0`): lookup nixpkgs commit with that exact version
2. Major version (`nodejs 20`): find latest 20.x.x available
3. Ranges (`jq ^1.6`): find highest version satisfying range
4. Prefer newer nixpkgs commits when multiple have same version

### Error Handling

When version not found, show helpful message with available alternatives:
"nodejs 20.11.0 not found. Available: 20.10.0, 20.11.1, 20.12.0"

## direnv Integration

### Setup

Users add to `~/.direnvrc`:

```bash
use_deps() {
  watch_file deps
  watch_file deps.lock
  eval "$(deps env)"
}
```

Project `.envrc`:

```bash
use deps
```

### deps env Behavior

- Reads deps.lock from current directory
- If lockfile missing/stale, runs install first
- Outputs PATH export commands
- Fast path when lockfile is fresh

## CLI Commands

| Command | Description |
|---------|-------------|
| `deps init` | Create empty deps file |
| `deps install` | Resolve and install dependencies |
| `deps add <pkg> <version>` | Add dependency and install |
| `deps remove <pkg>` | Remove dependency |
| `deps list` | Show installed packages |
| `deps shell` | Spawn subshell with deps in PATH |
| `deps env` | Output shell export commands |
| `deps direnv-setup` | Add use_deps to ~/.direnvrc |

Exit codes: 0 (success), 1 (general error), 2 (nix failure)

## Distribution

### Primary: Nix Flake

```
nix profile install github:jason/deps
```

### Secondary: curl Script

```
curl -fsSL https://example.com/deps/install.sh | sh
```

Downloads prebuilt bun binary to `~/.local/bin/deps`.

### Build Targets

- linux-x64
- linux-arm64
- darwin-x64
- darwin-arm64

## Project Structure

```
deps/
├── src/
│   ├── cli.ts
│   ├── parser.ts
│   ├── resolver.ts
│   ├── installer.ts
│   ├── env.ts
│   └── index.ts
├── data/
│   └── nix-versions.json
├── scripts/
│   └── install.sh
├── flake.nix
├── package.json
└── tsconfig.json
```

## Technology

- Runtime: Bun
- Language: TypeScript
- Distribution: `bun build --compile` for single executables
