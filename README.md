<p align="center">
  <img src="logo.png" alt="yamllint" width="200">
</p>

<h1 align="center">@asymmetric-effort/yamllint</h1>

<p align="center">
  A pure TypeScript YAML linter with configurable rules and detailed error reporting.
  Zero runtime dependencies (besides the <code>yaml</code> parser).
  Feature-compatible with <a href="https://github.com/adrienverge/yamllint">adrienverge/yamllint</a>.
</p>

<p align="center">
  <a href="https://github.com/asymmetric-effort/yamllint/actions"><img src="https://github.com/asymmetric-effort/yamllint/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/@asymmetric-effort/yamllint"><img src="https://img.shields.io/npm/v/@asymmetric-effort/yamllint" alt="npm"></a>
  <a href="https://github.com/asymmetric-effort/yamllint/blob/main/LICENSE.txt"><img src="https://img.shields.io/npm/l/@asymmetric-effort/yamllint" alt="license"></a>
</p>

---

## Features

- 24 configurable linting rules covering formatting, style, and correctness
- Multiple output formats: standard, parsable, colored, GitHub Actions
- Inline comment directives to suppress rules per-line or per-block
- Built-in `default` and `relaxed` configuration presets
- Recursive directory scanning with glob-based file filtering
- Strict mode with configurable severity levels (error/warning)
- Full CLI and programmatic API

## Installation

```bash
npm install -g @asymmetric-effort/yamllint
```

Or as a dev dependency:

```bash
npm install --save-dev @asymmetric-effort/yamllint
```

## Usage

### CLI

```bash
# Lint a file
yamllint myfile.yaml

# Lint a directory recursively
yamllint ./config/

# Read from stdin
cat myfile.yaml | yamllint -

# Use a custom config
yamllint -c .yamllint.yaml myfile.yaml

# Inline config
yamllint -d "extends: relaxed" myfile.yaml

# Parsable output for CI
yamllint -f parsable .

# Strict mode (exit 2 on warnings)
yamllint --strict .

# List targeted files
yamllint --list-files .
```

### Programmatic API

```typescript
import { lint, loadConfig } from "@asymmetric-effort/yamllint";

const source = `---
key: value
`;

const { resolved } = loadConfig(undefined, "extends: default");
const result = lint(source, resolved);

for (const problem of result.problems) {
  console.log(`${problem.line}:${problem.column} [${problem.level}] ${problem.message}`);
}
```

## Configuration

yamllint looks for configuration in these locations (in order):

1. `.yamllint`, `.yamllint.yaml`, or `.yamllint.yml` in the current or parent directories
2. File specified by `$YAMLLINT_CONFIG_FILE` environment variable
3. `$XDG_CONFIG_HOME/yamllint/config` (defaults to `~/.config/yamllint/config`)
4. Built-in `default` configuration

### Example Configuration

```yaml
extends: default

rules:
  line-length:
    max: 120
    level: warning
  document-start: disable
  truthy:
    allowed-values: ["true", "false"]
```

### Presets

| Preset | Description |
|--------|-------------|
| `default` | Strict — most rules enabled as errors |
| `relaxed` | Lenient — disables comments/truthy, downgrades others to warnings |

## Rules

| Rule | Type | Default | Description |
|------|------|---------|-------------|
| `anchors` | token | error | Validates anchor/alias usage |
| `braces` | token | error | Controls spacing inside `{}` |
| `brackets` | token | error | Controls spacing inside `[]` |
| `colons` | token | error | Enforces colon spacing |
| `commas` | line | error | Regulates comma spacing |
| `comments` | comment | warning | Enforces comment formatting |
| `comments-indentation` | comment | warning | Ensures comment alignment |
| `document-end` | token | disabled | Manages `...` marker |
| `document-start` | token | warning | Requires/forbids `---` marker |
| `empty-lines` | line | error | Limits consecutive blank lines |
| `empty-values` | token | disabled | Prevents implicit null values |
| `float-values` | token | disabled | Controls float representations |
| `hyphens` | token | error | Limits spaces after `-` |
| `indentation` | line | error | Enforces consistent indentation |
| `key-duplicates` | token | error | Prevents duplicate mapping keys |
| `key-ordering` | token | disabled | Alphabetizes mapping keys |
| `line-length` | line | error | Sets maximum line width |
| `new-line-at-end-of-file` | line | error | Requires trailing newline |
| `new-lines` | line | error | Standardizes line endings |
| `octal-values` | token | disabled | Prevents octal value confusion |
| `quoted-strings` | token | disabled | Controls string quoting |
| `trailing-spaces` | line | error | Removes trailing whitespace |
| `truthy` | token | warning | Restricts boolean representations |

## Comment Directives

Suppress rules inline using comment directives:

```yaml
# Disable a specific rule for one line
key: value  # yamllint disable-line rule:line-length

# Disable all rules for one line
key: value  # yamllint disable-line

# Disable rules for a block
# yamllint disable rule:colons
key : value
# yamllint enable rule:colons

# Disable all rules for the rest of the file
# yamllint disable-file
```

## Output Formats

| Format | Description |
|--------|-------------|
| `standard` | Human-readable with filename header |
| `parsable` | Machine-readable: `file:line:col: [level] msg (rule)` |
| `colored` | Standard with ANSI colors |
| `github` | GitHub Actions annotations |
| `auto` | Detects environment (GitHub Actions, TTY color support) |

## Exit Codes

| Code | Normal Mode | Strict Mode |
|------|------------|-------------|
| 0 | No errors | No errors or warnings |
| 1 | Errors found | Errors found |
| 2 | — | Warnings only |

## Development

```bash
# Setup
make setup

# Run tests
make test

# Lint
make lint

# Build
make build

# Release
make release
```

## License

[MIT](LICENSE.txt)
