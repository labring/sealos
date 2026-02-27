#!/bin/bash
set -ex

HELM_OPTS=${HELM_OPTS:-""}
RELEASE_NAME=${RELEASE_NAME:-"account-service"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"account-system"}
CHART_PATH=${CHART_PATH:-"./charts/account-service"}

adopt_namespaced_resource() {
  local kind="$1"
  local name="$2"
  if kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" >/dev/null 2>&1; then
    kubectl -n "${RELEASE_NAMESPACE}" label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl -n "${RELEASE_NAMESPACE}" annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi
}

get_cm_value() {
  local namespace="$1"
  local name="$2"
  local key="$3"
  kubectl get configmap "${name}" -n "${namespace}" -o "jsonpath={.data.${key}}" 2>/dev/null || true
}

# Adopt existing resources if this is a fresh helm install
if ! helm status "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
    kubectl label namespace "${RELEASE_NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl annotate namespace "${RELEASE_NAMESPACE}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi

  adopt_namespaced_resource configmap account-manager-env
  adopt_namespaced_resource configmap region-info
  adopt_namespaced_resource service account-service
  adopt_namespaced_resource deployment account-service
fi

# Build helm set args from ConfigMap
HELM_SET_ARGS=()
AUTO_CONFIG_HELM_OPTS=""

# Get cloud configuration from sealos-config ConfigMap
CLOUD_DOMAIN=$(get_cm_value sealos-system sealos-config cloudDomain)
CLOUD_PORT=$(get_cm_value sealos-system sealos-config cloudPort)

# Enable ingress if cloudDomain is configured
if [ -n "${CLOUD_DOMAIN}" ]; then
  AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set ingress.enabled=true"
  AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string cloudDomain=${CLOUD_DOMAIN}"

  if [ -n "${CLOUD_PORT}" ]; then
    AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string cloudPort=${CLOUD_PORT}"
  fi
fi

helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" \
  ${AUTO_CONFIG_HELM_OPTS} \
  ${HELM_OPTS}
