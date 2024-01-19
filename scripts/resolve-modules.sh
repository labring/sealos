#!/bin/bash
# Recursively finds all directories with a go.mod file and creates
# a GitHub Actions JSON output option. This is used by the linter action.
set -eu
FIND_VAR=${1:-.}

echo "Resolving modules in $(pwd)"

PATHS=$(find $FIND_VAR -type f -name go.mod -printf '{"workdir":"%h"},')
if [[ $FIND_VAR == "." ]]; then
  PATHS=$(find $FIND_VAR ! -path './controllers/*' ! -path './deprecated/*' ! -path './webhooks/*' ! -path './service/*' ! -path './test/*' -type f -name go.mod -printf '{"workdir":"%h"},')
fi
set -ex
echo matrix="{\"include\":[${PATHS%?}]}" >> $GITHUB_OUTPUT
