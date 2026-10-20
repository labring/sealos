#!/usr/bin/env bash
# Compatibility entrypoint. Helm now owns cluster-side webhook resources.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -n ${NAMESPACE:-} ]]; then export RELEASE_NAMESPACE="$NAMESPACE"; fi
exec bash "$SCRIPT_DIR/entrypoint.sh" "$@"
