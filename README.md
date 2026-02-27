# deps

Nix-powered dependency management without the Nix.

## Installation

```bash
nix profile install github:jason/deps
```

## Usage

### Initialize a project

```bash
deps init
```

### Add dependencies

Edit the `deps` file:

```
nodejs 20
python 3.11
ripgrep ^14
```

Or use the CLI:

```bash
deps add nodejs 20
deps add python 3.11
```

### direnv integration

One-time setup:

```bash
deps direnv-setup
```

In your project, create `.envrc`:

```bash
use deps
```

Then:

```bash
direnv allow
```

### Commands

| Command | Description |
|---------|-------------|
| `deps init` | Create a new deps file |
| `deps add [-g] <pkg> <version>` | Add a dependency (-g for global) |
| `deps remove [-g] <pkg>` | Remove a dependency |
| `deps list [-g \| --all]` | List dependencies |
| `deps env [--global]` | Output shell exports |
| `deps direnv-setup` | Configure direnv integration |

## Global Dependencies

Global dependencies are available in all shell sessions. They're stored in `~/.config/deps/`.

### Add global dependencies

```bash
deps add -g ripgrep 14
deps add -g jq 1.7
```

### List global and local deps

```bash
deps list -g        # Global only
deps list --all     # Both
```

### How it works

- `deps env` merges global and local deps (local takes precedence)
- `deps env --global` outputs only global deps

## Version Specification

- Exact: `nodejs 20.11.0`
- Major: `nodejs 20` (resolves to latest 20.x)
- Caret: `jq ^1.6` (resolves to latest 1.x >= 1.6)
- GTE: `python >=3.10` (resolves to latest >= 3.10)

## License

MIT
