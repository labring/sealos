#!/usr/bin/env bash
# Compatibility entrypoint. Helm now owns cluster-side webhook resources.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -n ${NAMESPACE:-} ]]; then export RELEASE_NAMESPACE="$NAMESPACE"; fi
if [[ ${1:-apply} == delete ]]; then
  echo 'Use Helm to uninstall this release after disabling its admission registration.' >&2
  echo 'See webhooks/deploy/README.md; RuntimeClass and node runtime removal require a separate check of running Pods.' >&2
  exit 1
fi
exec bash "$SCRIPT_DIR/entrypoint.sh" "$@"
