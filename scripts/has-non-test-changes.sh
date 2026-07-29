#!/bin/bash
# Returns success when a diff under the given path includes at least one non-test file.
set -euo pipefail

PATH_PREFIX=${1:-.}
BASE_REF=${2:-}
HEAD_REF=${3:-HEAD}

if [[ -z ${BASE_REF} ]] || ! git cat-file -e "${BASE_REF}^{commit}" 2>/dev/null || ! git cat-file -e "${HEAD_REF}^{commit}" 2>/dev/null; then
  exit 0
fi

while IFS= read -r changed_file; do
  [[ -z ${changed_file} ]] && continue
  if [[ ${changed_file} != *_test.go ]]; then
    exit 0
  fi
done < <(git diff --name-only "${BASE_REF}...${HEAD_REF}" -- "${PATH_PREFIX}")

exit 1
