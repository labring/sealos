#!/bin/bash
set -eo pipefail

HELM_OPTS=${HELM_OPTS:-""}
HELM_OPTIONS=${HELM_OPTIONS:-""}
RELEASE_NAME=${RELEASE_NAME:-"user-controller"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"user-system"}
CHART_PATH=${CHART_PATH:-"./charts/user-controller"}
HELM_SET_ARGS=()

get_cm_value() {
  local namespace="$1"
  local name="$2"
  local key="$3"
  kubectl get configmap "${name}" -n "${namespace}" -o "jsonpath={.data.${key}}" 2>/dev/null || true
}

add_set_string() {
  local key="$1"
  local value="$2"
  value=${value//\\/\\\\}
  value=${value//,/\\,}
  HELM_SET_ARGS+=(--set-string "${key}=${value}")
}

# Clean up old resources
kubectl delete -f ./drop/ --ignore-not-found

# Auto configure from sealos-config, then fall back to chart defaults.
DEFAULT_SEALOS_CLOUD_DOMAIN="127.0.0.1.nip.io"
DEFAULT_SEALOS_CLOUD_APISERVER_PORT="6443"

SEALOS_CLOUD_DOMAIN=${SEALOS_CLOUD_DOMAIN:-"${cloudDomain:-$(get_cm_value sealos-system sealos-config cloudDomain)}"}
SEALOS_CLOUD_DOMAIN=${SEALOS_CLOUD_DOMAIN:-"${DEFAULT_SEALOS_CLOUD_DOMAIN}"}
SEALOS_CLOUD_APISERVER_PORT=${SEALOS_CLOUD_APISERVER_PORT:-"${apiserverPort:-$(get_cm_value sealos-system sealos-config apiserverPort)}"}
SEALOS_CLOUD_APISERVER_PORT=${SEALOS_CLOUD_APISERVER_PORT:-"${DEFAULT_SEALOS_CLOUD_APISERVER_PORT}"}

add_set_string cloudAPIServerDomain "${SEALOS_CLOUD_DOMAIN}"
add_set_string cloudAPIServerPort "${SEALOS_CLOUD_APISERVER_PORT}"

# Prepare values files
SERVICE_NAME="user-controller"
USER_VALUES_PATH="/root/.sealos/cloud/values/core/${SERVICE_NAME}-values.yaml"

# Copy user values template if not exists
if [ ! -f "${USER_VALUES_PATH}" ]; then
  mkdir -p "$(dirname "${USER_VALUES_PATH}")"
  cp "./charts/${SERVICE_NAME}/${SERVICE_NAME}-values.yaml" "${USER_VALUES_PATH}"
fi

# Deploy Helm chart
helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" \
  -f "./charts/${SERVICE_NAME}/values.yaml" \
  -f "${USER_VALUES_PATH}" \
  "${HELM_SET_ARGS[@]}" \
  ${HELM_OPTIONS} \
  ${HELM_OPTS}

# Apply CRDs
helm show crds ./charts/${SERVICE_NAME} | kubectl apply -f - --server-side --force-conflicts
