#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC2034 # consumed by the sourced module-specific library
readonly MODULE=admission
LIBRARY="${SCRIPT_DIR}/helm-webhook.sh"
[[ -f "$LIBRARY" ]] || LIBRARY="${SCRIPT_DIR}/../../deploy/helm-webhook.sh"
# shellcheck disable=SC1090,SC1091
source "$LIBRARY"
