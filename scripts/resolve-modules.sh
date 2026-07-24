#!/bin/bash
# Recursively finds directories with a go.mod file and writes a GitHub Actions
# matrix for linter jobs. With --changed, only modules owning changed files are
# included.
set -euo pipefail

FIND_VAR=${1:-.}
MODE=${2:-}
BASE_REF=${3:-}
HEAD_REF=${4:-HEAD}

echo "Resolving modules in $(pwd)"

resolve_modules() {
  if [[ $FIND_VAR == "." ]]; then
    find "$FIND_VAR" \
      ! -path './controllers/*' \
      ! -path './deprecated/*' \
      ! -path './webhooks/*' \
      ! -path './service/*' \
      ! -path './lifecycle/*' \
      -type f -name go.mod -printf '%h\n'
  else
    find "$FIND_VAR" -type f -name go.mod -printf '%h\n'
  fi | sort
}

module_key() {
  local module=$1
  module=${module#./}
  if [[ $module == "." ]]; then
    module=""
  fi
  printf '%s' "$module"
}

owns_file() {
  local module=$1
  local changed_file=$2
  local key

  key=$(module_key "$module")
  if [[ -z $key ]]; then
    return 0
  fi
  [[ $changed_file == "$key" || $changed_file == "$key/"* ]]
}

json_escape() {
  local value=$1
  value=${value//\\/\\\\}
  value=${value//\"/\\\"}
  printf '%s' "$value"
}

mapfile -t MODULES < <(resolve_modules)

if [[ -n $MODE && $MODE != "--changed" ]]; then
  echo "unknown mode: $MODE" >&2
  exit 1
fi

if [[ $MODE == "--changed" ]]; then
  if [[ -z $BASE_REF ]] || ! git cat-file -e "${BASE_REF}^{commit}" 2>/dev/null || ! git cat-file -e "${HEAD_REF}^{commit}" 2>/dev/null; then
    echo "Base or head ref is unavailable; falling back to all modules"
  else
    declare -A SELECTED_MODULES=()

    while IFS= read -r changed_file; do
      best_module=""
      best_len=-1

      for module in "${MODULES[@]}"; do
        if ! owns_file "$module" "$changed_file"; then
          continue
        fi

        key=$(module_key "$module")
        if (( ${#key} > best_len )); then
          best_module=$module
          best_len=${#key}
        fi
      done

      if [[ -n $best_module ]]; then
        SELECTED_MODULES["$best_module"]=1
      fi
    done < <(git diff --name-only "${BASE_REF}...${HEAD_REF}" -- "$FIND_VAR")

    CHANGED_MODULES=()
    for module in "${MODULES[@]}"; do
      if [[ -n ${SELECTED_MODULES[$module]:-} ]]; then
        CHANGED_MODULES+=("$module")
      fi
    done
    MODULES=("${CHANGED_MODULES[@]}")
  fi
fi

PATHS=""
for module in "${MODULES[@]}"; do
  PATHS="$PATHS{\"workdir\":\"$(json_escape "$module")\"},"
done

MATRIX="{\"include\":[${PATHS%,}]}"
HAS_MODULES=false
if (( ${#MODULES[@]} > 0 )); then
  HAS_MODULES=true
fi

{
  echo "matrix=$MATRIX"
  echo "has_modules=$HAS_MODULES"
} >> "$GITHUB_OUTPUT"
