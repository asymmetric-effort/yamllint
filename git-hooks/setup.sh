#!/bin/bash
set -euo pipefail

HOOKS_DIR="$(cd "$(dirname "$0")" && pwd)"
GIT_DIR="$(cd "$HOOKS_DIR/.." && git rev-parse --git-dir)"

echo "Installing git hooks from $HOOKS_DIR into $GIT_DIR/hooks..."

for hook in "$HOOKS_DIR"/pre-*; do
  [ -f "$hook" ] || continue
  name="$(basename "$hook")"
  cp "$hook" "$GIT_DIR/hooks/$name"
  chmod +x "$GIT_DIR/hooks/$name"
  echo "  Installed $name"
done

echo "Git hooks installed."
