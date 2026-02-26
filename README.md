# deps

Nix-powered dependency management without the Nix.

## Installation

### Via Nix (recommended)

```bash
nix profile install github:jason/deps
```

### Via curl

```bash
curl -fsSL https://raw.githubusercontent.com/jason/deps/main/scripts/install.sh | sh
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

### Install dependencies

```bash
deps install
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
| `deps install` | Install dependencies |
| `deps add <pkg> <version>` | Add a dependency |
| `deps remove <pkg>` | Remove a dependency |
| `deps list` | List installed dependencies |
| `deps shell` | Spawn shell with deps in PATH |
| `deps env` | Output shell exports |
| `deps direnv-setup` | Configure direnv integration |

## Version Specification

- Exact: `nodejs 20.11.0`
- Major: `nodejs 20` (resolves to latest 20.x)
- Caret: `jq ^1.6` (resolves to latest 1.x >= 1.6)
- GTE: `python >=3.10` (resolves to latest >= 3.10)

## License

MIT
