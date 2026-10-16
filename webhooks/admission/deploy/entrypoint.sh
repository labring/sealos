#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export WEBHOOK_MODULE=admission
LIBRARY="${SCRIPT_DIR}/helm-webhook.sh"
[[ -f "$LIBRARY" ]] || LIBRARY="${SCRIPT_DIR}/../../deploy/helm-webhook.sh"
# shellcheck disable=SC1091
source "$LIBRARY"
