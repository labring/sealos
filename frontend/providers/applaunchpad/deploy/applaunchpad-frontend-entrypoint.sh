#!/bin/bash
set -euo pipefail

RELEASE_NAME=${RELEASE_NAME:-"applaunchpad-frontend"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"applaunchpad-frontend"}
CHART_PATH=${CHART_PATH:-"./charts/applaunchpad-frontend"}

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

add_set_json() {
  local key="$1"
  local value="$2"
  if [ -n "${value}" ]; then
    AUTO_CONFIG_HELM_OPTS+=(--set-json "${key}=${value}")
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

SEALOS_CLOUD_DOMAIN=${CONFIG_CLOUD_DOMAIN:-${SEALOS_CLOUD_DOMAIN:-${cloudDomain:-}}}
SEALOS_CLOUD_PORT=${CONFIG_CLOUD_PORT:-${SEALOS_CLOUD_PORT:-${cloudPort:-}}}
SEALOS_HTTP_PORT=${CONFIG_HTTP_PORT:-${SEALOS_HTTP_PORT:-${httpPort:-}}}
SEALOS_DISABLE_HTTPS=${CONFIG_DISABLE_HTTPS:-${SEALOS_DISABLE_HTTPS:-${disableHttps:-}}}
SEALOS_CERT_SECRET_NAME=${CONFIG_CERT_SECRET_NAME:-${SEALOS_CERT_SECRET_NAME:-${certSecretName:-}}}

add_set_string applaunchpadConfig.cloudDomain "${SEALOS_CLOUD_DOMAIN}"
add_set_string applaunchpadConfig.cloudPort "${SEALOS_CLOUD_PORT}"
add_set_string applaunchpadConfig.httpPort "${SEALOS_HTTP_PORT}"
add_set_string applaunchpadConfig.disableHttps "${SEALOS_DISABLE_HTTPS}"
add_set_string applaunchpadConfig.certSecretName "${SEALOS_CERT_SECRET_NAME}"
add_set_string applaunchpadConfig.monitorUrl "${monitorUrl:-}"
add_set_string applaunchpadConfig.billingUrl "${billingUrl:-}"
add_set_string applaunchpadConfig.logUrl "${logUrl:-}"
add_set_string applaunchpadConfig.tlsRejectUnauthorized "${tlsRejectUnauthorized:-}"
add_set_string applaunchpadConfig.customDomainMode "${customDomainMode:-}"
add_set_string applaunchpadConfig.customDomainCertificateSecretName "${customDomainCertificateSecretName:-}"

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
    kubectl -n "${namespace}" annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null
  fi
}

echo "Checking and adopting existing resources..."
if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" configmap applaunchpad-frontend-config
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" deployment applaunchpad-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" serviceaccount applaunchpad-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" service applaunchpad-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" ingress applaunchpad-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" ingress applaunchpad-challenge
fi

adopt_namespaced_resource app-system apps.app.sealos.io applaunchpad
adopt_namespaced_resource sealos-system role applaunchpad-frontend-custom-domain-reader
adopt_namespaced_resource sealos-system rolebinding applaunchpad-frontend-custom-domain-reader
adopt_namespaced_resource higress-system role applaunchpad-frontend-higress-config-reader
adopt_namespaced_resource higress-system rolebinding applaunchpad-frontend-higress-config-reader

SERVICE_NAME="applaunchpad-frontend"
USER_VALUES_PATH="/root/.sealos/cloud/values/core/${SERVICE_NAME}-values.yaml"

if [ ! -f "${USER_VALUES_PATH}" ]; then
  mkdir -p "$(dirname "${USER_VALUES_PATH}")"
  cp "./charts/${SERVICE_NAME}/${SERVICE_NAME}-values.yaml" "${USER_VALUES_PATH}"
fi

echo "Deploying Helm chart..."
helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" \
  -f "./charts/${SERVICE_NAME}/values.yaml" \
  -f "${USER_VALUES_PATH}" \
  "${AUTO_CONFIG_HELM_OPTS[@]}" \
  "${HELM_EXTRA_ARGS[@]}"
