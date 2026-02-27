# API Simplification Design

## Overview

Simplify the deps CLI by removing redundant commands, eliminating the binary installation method, and adding global deps support. The goal is a clean, minimal API that relies on direnv for environment management.

## Final CLI API

| Command | Description |
|---------|-------------|
| `deps init` | Create a deps file in current directory |
| `deps add [-g] <pkg> <version>` | Add dependency (auto-installs) |
| `deps remove [-g] <pkg>` | Remove dependency |
| `deps list [-g \| --all]` | List dependencies |
| `deps env [--global]` | Output shell exports (auto-installs if needed) |
| `deps direnv-setup` | Configure direnv integration |

## Removals

### Commands Removed

- **`deps install`** - Replaced by auto-install in `add` and `env`
- **`deps shell`** - Replaced by direnv integration

### Files Deleted

- `src/commands/shell.ts`
- `src/commands/install.ts`
- `scripts/install.sh`

### Package.json Changes

Remove cross-platform build scripts (no longer publishing binary releases):
- `build:linux-x64`
- `build:linux-arm64`
- `build:darwin-x64`
- `build:darwin-arm64`
- `build:all`

Keep `build` script for local compilation.

## Auto-Install

### Implementation

Extract install logic into reusable helper in `src/installer.ts`:

```typescript
export async function ensureInstalled(cwd: string): Promise<Lockfile | null>
```

This function:
1. Reads deps file
2. Checks if lockfile is stale
3. If stale, resolves and installs dependencies
4. Returns lockfile (or null if no deps)

### Integration Points

- **`deps add`** - After writing new dependency, call `ensureInstalled(cwd)`
- **`deps env`** - Before generating exports, call `ensureInstalled(cwd)`

Fast path: If lockfile is up-to-date, no install happens.

## Global Deps Support

### Directory Structure

```
~/.config/deps/
├── deps          # Global deps file
└── deps.lock     # Global lockfile
```

### New Helper Module: `src/paths.ts`

```typescript
export function getGlobalDepsDir(): string
export function getGlobalDepsPath(): string
export function getGlobalLockfilePath(): string
export async function ensureGlobalDepsDir(): Promise<void>
```

### Flag Behavior

| Command | `-g` / `--global` behavior |
|---------|---------------------------|
| `deps add -g <pkg> <ver>` | Write to `~/.config/deps/deps`, auto-install |
| `deps remove -g <pkg>` | Remove from `~/.config/deps/deps` |
| `deps list -g` | List global deps only |
| `deps list --all` | List both local and global with labels |
| `deps env --global` | Export only global deps PATH |
| `deps env` (no flag) | Export merged global + local |

### PATH Merge Logic

When `deps env` runs without `--global`:
1. Read global lockfile, extract PATH entries
2. Read local lockfile, extract PATH entries
3. Prepend local paths (local takes precedence)
4. Export combined PATH

## Implementation Order

1. Remove `shell` command and `install` command
2. Remove `scripts/install.sh` and cross-platform build scripts
3. Add `ensureInstalled` helper and integrate into `add` and `env`
4. Add `src/paths.ts` helper module
5. Add `-g` flag to `add`, `remove`, `list`
6. Add `--global` flag and merge logic to `env`
7. Update README (remove curl install, add global deps docs)
8. Delete `PLAN-global-deps.md`

## Testing

### New Tests

- `tests/paths.test.ts` - Global path helpers
- Update `tests/integration.test.ts` - `-g` flag behavior
- Update `tests/env.test.ts` - Global+local merge

### Tests to Update

- Remove shell command tests if any exist
- Keep `tests/installer.test.ts` (installer module still used)
