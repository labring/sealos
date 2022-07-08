#!/bin/bash
# Recursively finds all directories with a go.mod file and creates
# a GitHub Actions JSON output option. This is used by the linter action.

echo "Resolving modules in $(pwd)"

PATHS=$(find . -type f -name go.mod -printf '{"workdir":"%h"},')
echo "::set-output name=matrix::{\"include\":[${PATHS%?}]}"
