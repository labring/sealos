#!/bin/bash

# Get script directory and frontend directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"

for file in "$@"; do
  # Check if file is in devbox directory
  if [[ $file == *"/providers/devbox/"* ]]; then
    (cd "$FRONTEND_DIR/providers/devbox" && pnpm exec prettier --write "$file")
  else
    (cd "$FRONTEND_DIR" && pnpm exec prettier --write "$file")
  fi
done
