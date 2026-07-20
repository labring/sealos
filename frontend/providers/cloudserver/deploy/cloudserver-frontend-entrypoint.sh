#!/bin/bash
set -euo pipefail

RELEASE_NAME=${RELEASE_NAME:-"cloudserver-frontend"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"cloudserver-frontend"}
SERVICE_NAME="cloudserver-frontend"
CHART_PATH=${CHART_PATH:-"./charts/${SERVICE_NAME}"}

get_cm_value() {
  local namespace="$1"
  local name="$2"
  local key="$3"
  kubectl get configmap "${name}" -n "${namespace}" -o "jsonpath={.data.${key}}" 2>/dev/null || true
}

add_set_string() {
  local key="$1"
  local value="$2"
  if [ -n "${value}" ]; then
    AUTO_CONFIG_HELM_OPTS+=(--set-string "${key}=${value}")
  fi
}

AUTO_CONFIG_HELM_OPTS=()
HELM_EXTRA_ARGS=()
if [ -n "${HELM_OPTIONS:-}" ]; then
  read -r -a PARSED_HELM_OPTIONS <<< "${HELM_OPTIONS}"
  HELM_EXTRA_ARGS+=("${PARSED_HELM_OPTIONS[@]}")
fi
if [ -n "${HELM_OPTS:-}" ]; then
  read -r -a PARSED_HELM_OPTS <<< "${HELM_OPTS}"
  HELM_EXTRA_ARGS+=("${PARSED_HELM_OPTS[@]}")
fi

CONFIG_CLOUD_DOMAIN=$(get_cm_value sealos-system sealos-config cloudDomain)
CONFIG_CLOUD_PORT=$(get_cm_value sealos-system sealos-config cloudPort)
CONFIG_HTTP_PORT=$(get_cm_value sealos-system sealos-config httpPort)
CONFIG_DISABLE_HTTPS=$(get_cm_value sealos-system sealos-config disableHttps)
CONFIG_CERT_SECRET_NAME=$(get_cm_value sealos-system sealos-config certSecretName)
CONFIG_JWT_INTERNAL=$(get_cm_value sealos-system sealos-config jwtInternal)

add_set_string cloudserverConfig.cloudDomain "${CONFIG_CLOUD_DOMAIN:-${cloudDomain:-}}"
add_set_string cloudserverConfig.cloudPort "${CONFIG_CLOUD_PORT:-${cloudPort:-}}"
add_set_string cloudserverConfig.httpPort "${CONFIG_HTTP_PORT:-${httpPort:-}}"
add_set_string cloudserverConfig.disableHttps "${CONFIG_DISABLE_HTTPS:-${disableHttps:-}}"
add_set_string cloudserverConfig.certSecretName "${CONFIG_CERT_SECRET_NAME:-${certSecretName:-}}"
add_set_string cloudserverConfig.lafBaseUrl "${lafBaseUrl:-}"
add_set_string cloudserverConfig.jwtSecretApp "${CONFIG_JWT_INTERNAL:-${jwtSecretApp:-}}"

adopt_namespaced_resource() {
  local namespace="$1"
  local kind="$2"
  local name="$3"
  if kubectl -n "${namespace}" get "${kind}" "${name}" >/dev/null 2>&1; then
    local ownership managed_by owner_release owner_namespace
    ownership=$(kubectl -n "${namespace}" get "${kind}" "${name}" \
      -o jsonpath='{.metadata.labels.app\.kubernetes\.io/managed-by}{"|"}{.metadata.annotations.meta\.helm\.sh/release-name}{"|"}{.metadata.annotations.meta\.helm\.sh/release-namespace}')
    IFS='|' read -r managed_by owner_release owner_namespace <<< "${ownership}"
    if { [ "${managed_by}" = "Helm" ] || [ -n "${owner_release}" ] || [ -n "${owner_namespace}" ]; } && \
      { [ "${owner_release}" != "${RELEASE_NAME}" ] || [ "${owner_namespace}" != "${RELEASE_NAMESPACE}" ]; }; then
      echo "Refusing to adopt ${kind} ${namespace}/${name}: owned by Helm release ${owner_namespace}/${owner_release}" >&2
      return 1
    fi
    if [ "${managed_by}" = "Helm" ]; then
      return 0
    fi
    echo "Adopting ${kind} ${namespace}/${name}..."
    kubectl -n "${namespace}" label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null
    kubectl -n "${namespace}" annotate "${kind}" "${name}" \
      meta.helm.sh/release-name="${RELEASE_NAME}" \
      meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null
  fi
}

echo "Checking and adopting existing resources..."
if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" configmap cloudserver-frontend-config
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" secret cloudserver-frontend-secret
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" deployment cloudserver-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" service cloudserver-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" ingress cloudserver-frontend
fi
adopt_namespaced_resource app-system apps.app.sealos.io cloudserver

USER_VALUES_PATH="/root/.sealos/cloud/values/core/${SERVICE_NAME}-values.yaml"
if [ ! -f "${USER_VALUES_PATH}" ]; then
  mkdir -p "$(dirname "${USER_VALUES_PATH}")"
  cp "${CHART_PATH}/${SERVICE_NAME}-values.yaml" "${USER_VALUES_PATH}"
fi

echo "Deploying Helm chart..."
helm upgrade --install "${RELEASE_NAME}" "${CHART_PATH}" \
  --namespace "${RELEASE_NAMESPACE}" \
  --create-namespace \
  -f "${CHART_PATH}/values.yaml" \
  -f "${USER_VALUES_PATH}" \
  "${AUTO_CONFIG_HELM_OPTS[@]}" \
  "${HELM_EXTRA_ARGS[@]}"
