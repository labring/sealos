#!/bin/bash
set -euo pipefail

RELEASE_NAME=${RELEASE_NAME:-"kubepanel-frontend"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"kubepanel-frontend"}
SERVICE_NAME="kubepanel-frontend"
CHART_PATH=${CHART_PATH:-"./charts/${SERVICE_NAME}"}
USER_VALUES_PATH=${USER_VALUES_PATH:-"/root/.sealos/cloud/values/core/${SERVICE_NAME}-values.yaml"}

get_cm_value() {
  local key="$1"
  kubectl get configmap sealos-config -n sealos-system \
    -o "jsonpath={.data.${key}}" 2>/dev/null || true
}

declare -a helm_args=(
  upgrade --install "${RELEASE_NAME}" "${CHART_PATH}"
  --namespace "${RELEASE_NAMESPACE}"
  --create-namespace
  --values "${CHART_PATH}/values.yaml"
  --values "${USER_VALUES_PATH}"
)

add_set_string() {
  local key="$1"
  local value="$2"
  if [[ -n "${value}" ]]; then
    helm_args+=(--set-string "${key}=${value}")
  fi
}

adopt_namespaced_resource() {
  local namespace="$1"
  local kind="$2"
  local name="$3"
  if kubectl get "${kind}" "${name}" -n "${namespace}" >/dev/null 2>&1; then
    local ownership managed_by owner_release owner_namespace
    ownership=$(kubectl get "${kind}" "${name}" -n "${namespace}" \
      -o jsonpath='{.metadata.labels.app\.kubernetes\.io/managed-by}{"|"}{.metadata.annotations.meta\.helm\.sh/release-name}{"|"}{.metadata.annotations.meta\.helm\.sh/release-namespace}')
    IFS='|' read -r managed_by owner_release owner_namespace <<< "${ownership}"
    if [[ "${managed_by}" == "Helm" || -n "${owner_release}" || -n "${owner_namespace}" ]] &&
      [[ "${owner_release}" != "${RELEASE_NAME}" || "${owner_namespace}" != "${RELEASE_NAMESPACE}" ]]; then
      echo "Refusing to adopt ${kind} ${namespace}/${name}: owned by Helm release ${owner_namespace}/${owner_release}" >&2
      return 1
    fi
    if [[ "${managed_by}" == "Helm" ]]; then
      return 0
    fi
    echo "Adopting ${kind} ${namespace}/${name}"
    kubectl label "${kind}" "${name}" -n "${namespace}" \
      app.kubernetes.io/managed-by=Helm --overwrite
    kubectl annotate "${kind}" "${name}" -n "${namespace}" \
      meta.helm.sh/release-name="${RELEASE_NAME}" \
      meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite
  fi
}

if ! helm status "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" configmap kubepanel-frontend-config
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" deployment kubepanel-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" service kubepanel-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" ingress kubepanel-frontend
  adopt_namespaced_resource app-system apps.app.sealos.io kubepanel
fi

mkdir -p "$(dirname "${USER_VALUES_PATH}")"
if [[ ! -f "${USER_VALUES_PATH}" ]]; then
  cp "${CHART_PATH}/${SERVICE_NAME}-values.yaml" "${USER_VALUES_PATH}"
fi

config_cloud_domain=$(get_cm_value cloudDomain)
config_cloud_port=$(get_cm_value cloudPort)
config_http_port=$(get_cm_value httpPort)
config_disable_https=$(get_cm_value disableHttps)
config_cert_secret_name=$(get_cm_value certSecretName)

add_set_string kubepanelConfig.cloudDomain "${config_cloud_domain:-${SEALOS_CLOUD_DOMAIN:-${cloudDomain:-}}}"
add_set_string kubepanelConfig.cloudPort "${config_cloud_port:-${SEALOS_CLOUD_PORT:-${cloudPort:-}}}"
add_set_string kubepanelConfig.httpPort "${config_http_port:-${SEALOS_HTTP_PORT:-${httpPort:-}}}"
add_set_string kubepanelConfig.disableHttps "${config_disable_https:-${SEALOS_DISABLE_HTTPS:-${disableHttps:-}}}"
add_set_string kubepanelConfig.certSecretName "${config_cert_secret_name:-${SEALOS_CERT_SECRET_NAME:-${certSecretName:-}}}"

declare -a extra_args=()
if [[ -n "${HELM_OPTIONS:-}" ]]; then
  read -r -a parsed_options <<< "${HELM_OPTIONS}"
  extra_args+=("${parsed_options[@]}")
fi
if [[ -n "${HELM_OPTS:-}" ]]; then
  read -r -a parsed_opts <<< "${HELM_OPTS}"
  extra_args+=("${parsed_opts[@]}")
fi

echo "Deploying ${RELEASE_NAME} with Helm"
helm "${helm_args[@]}" "${extra_args[@]}"
