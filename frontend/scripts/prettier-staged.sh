#!/bin/bash

# Get script directory and frontend directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"

for file in "$@"; do
  (cd "$FRONTEND_DIR" && pnpm exec prettier --write "$file")
done
