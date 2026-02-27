#!/bin/bash
set -e

HELM_OPTS=${HELM_OPTS:-""}
RELEASE_NAME=${RELEASE_NAME:-"account-service"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"account-system"}
CHART_PATH=${CHART_PATH:-"./charts/account-service"}
ACCOUNT_SERVICE_BACKUP_ENABLED=${ACCOUNT_SERVICE_BACKUP_ENABLED:-"true"}
ACCOUNT_SERVICE_BACKUP_DIR=${ACCOUNT_SERVICE_BACKUP_DIR:-"/tmp/sealos-backup/account-service"}

adopt_namespaced_resource() {
  local kind="$1"
  local name="$2"
  if kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" >/dev/null 2>&1; then
    kubectl -n "${RELEASE_NAMESPACE}" label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl -n "${RELEASE_NAMESPACE}" annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi
}

adopt_cluster_resource() {
  local kind="$1"
  local name="$2"
  if kubectl get "${kind}" "${name}" >/dev/null 2>&1; then
    kubectl label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi
}

get_cm_value() {
  local namespace="$1"
  local name="$2"
  local key="$3"
  kubectl get configmap "${name}" -n "${namespace}" -o "jsonpath={.data.${key}}" 2>/dev/null || true
}

backup_ns_resource() {
  local kind="$1"
  local name="$2"
  if kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" >/dev/null 2>&1; then
    kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" -o yaml >> "${ACCOUNT_SERVICE_BACKUP_FILE}"
    printf "\n---\n" >> "${ACCOUNT_SERVICE_BACKUP_FILE}"
  fi
}

backup_cluster_resource() {
  local kind="$1"
  local name="$2"
  if kubectl get "${kind}" "${name}" >/dev/null 2>&1; then
    kubectl get "${kind}" "${name}" -o yaml >> "${ACCOUNT_SERVICE_BACKUP_FILE}"
    printf "\n---\n" >> "${ACCOUNT_SERVICE_BACKUP_FILE}"
  fi
}

backup_account_service_resources() {
  if [ "${ACCOUNT_SERVICE_BACKUP_ENABLED}" != "true" ]; then
    return
  fi
  local ts
  ts=$(date +%Y%m%d%H%M%S)
  mkdir -p "${ACCOUNT_SERVICE_BACKUP_DIR}"
  ACCOUNT_SERVICE_BACKUP_FILE="${ACCOUNT_SERVICE_BACKUP_DIR}/update-${ts}.yaml"
  : > "${ACCOUNT_SERVICE_BACKUP_FILE}"

  backup_cluster_resource clusterrole account-node-viewer
  backup_cluster_resource clusterrolebinding account-node-viewer-binding

  if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
    kubectl get namespace "${RELEASE_NAMESPACE}" -o yaml >> "${ACCOUNT_SERVICE_BACKUP_FILE}"
    printf "\n---\n" >> "${ACCOUNT_SERVICE_BACKUP_FILE}"
  fi
  backup_ns_resource configmap account-manager-env
  backup_ns_resource configmap region-info
  backup_ns_resource service account-service
  backup_ns_resource deployment account-service
  backup_ns_resource ingress account-service
}

# 执行备份
backup_account_service_resources

HELM_SET_ARGS=()

AUTO_CONFIG_HELM_OPTS=""

# Auto-fetch ingress configuration from sealos-config ConfigMap
CLOUD_DOMAIN=$(get_cm_value sealos-system sealos-config cloudDomain)
CLOUD_PORT=$(get_cm_value sealos-system sealos-config cloudPort)

[ -n "${CLOUD_DOMAIN}" ] && AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string ingress.cloudDomain=${CLOUD_DOMAIN}"
[ -n "${CLOUD_PORT}" ] && AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string ingress.cloudPort=${CLOUD_PORT}"

# Adopt existing resources if this is a fresh helm install
if ! helm status "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
    kubectl label namespace "${RELEASE_NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl annotate namespace "${RELEASE_NAMESPACE}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi

  adopt_cluster_resource clusterrole account-node-viewer
  adopt_cluster_resource clusterrolebinding account-node-viewer-binding

  adopt_namespaced_resource configmap account-manager-env
  adopt_namespaced_resource configmap region-info
  adopt_namespaced_resource service account-service
  adopt_namespaced_resource deployment account-service
  adopt_namespaced_resource ingress account-service
fi

# Prepare values files
SERVICE_NAME="account-service"
USER_VALUES_PATH="/root/.sealos/cloud/values/core/${SERVICE_NAME}-values.yaml"

# Copy user values template if not exists
if [ ! -f "${USER_VALUES_PATH}" ]; then
  mkdir -p "$(dirname "${USER_VALUES_PATH}")"
  cp "./charts/${SERVICE_NAME}/${SERVICE_NAME}-values.yaml" "${USER_VALUES_PATH}"
fi

# merge all helm_opts
# 1. AUTO_CONFIG_HELM_OPTS (Configuration automatically obtained from ConfigMap)
# 2. HELM_SET_ARGS (parameters set internally in the script)
# 3. HELM_OPTS (the parameter passed by the user via --env, with the highest priority, can override the previous configuration)
helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" \
  -f "./charts/${SERVICE_NAME}/values.yaml" \
  -f "${USER_VALUES_PATH}" \
  ${AUTO_CONFIG_HELM_OPTS} \
  "${HELM_SET_ARGS[@]}" \
  ${HELM_OPTS}
