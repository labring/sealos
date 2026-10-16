#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEBHOOK_MODULE=admission
LIBRARY="${SCRIPT_DIR}/helm-webhook.sh"
[[ -f "$LIBRARY" ]] || LIBRARY="${SCRIPT_DIR}/../../deploy/helm-webhook.sh"
# shellcheck source=../../deploy/helm-webhook.sh
source "$LIBRARY"
