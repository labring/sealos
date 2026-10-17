#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RELEASE_NAME=${RELEASE_NAME:-"vlogs"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"sealos"}
CHART_PATH=${CHART_PATH:-"${SCRIPT_DIR}/charts/vlogs-service"}
HELM_OPTS=${HELM_OPTS:-""}
PACKAGED_APP_VALUES_FILE=${PACKAGED_APP_VALUES_FILE:-${CHART_APP_VALUES_FILE:-"${CHART_PATH}/vlogs-service-values.yaml"}}
USER_VALUES_FILE=${USER_VALUES_FILE:-"/root/.sealos/cloud/values/core/vlogs-service-values.yaml"}

[[ -d "${CHART_PATH}" ]] || {
  echo "chart directory not found: ${CHART_PATH}" >&2
  exit 1
}
[[ -f "${PACKAGED_APP_VALUES_FILE}" ]] || {
  echo "packaged values file not found: ${PACKAGED_APP_VALUES_FILE}" >&2
  exit 1
}

# Preserve site configuration on upgrades. Do not pin the packaged image here:
# an image omitted from user values follows the new chart's image on upgrade.
umask 077
mkdir -p "$(dirname "${USER_VALUES_FILE}")"
if [[ ! -f "${USER_VALUES_FILE}" ]]; then
  cp "${PACKAGED_APP_VALUES_FILE}" "${USER_VALUES_FILE}"
  echo "Generated default user values at ${USER_VALUES_FILE}"
fi

echo "Using user values from ${USER_VALUES_FILE}"
# HELM_OPTS supports the installer's whitespace-separated flags. Use a values
# file or positional arguments for values containing spaces. Disable globbing.
set -f
# shellcheck disable=SC2086
helm upgrade -i "${RELEASE_NAME}" "${CHART_PATH}" \
  -n "${RELEASE_NAMESPACE}" --create-namespace \
  -f "${USER_VALUES_FILE}" ${HELM_OPTS} "$@"
