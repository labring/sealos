#!/bin/bash
set -ex

HELM_OPTS=${HELM_OPTS:-""}
RELEASE_NAME=${RELEASE_NAME:-"terminal"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"terminal-system"}
CHART_PATH=${CHART_PATH:-"./charts/terminal-controller"}

TERMINAL_BACKUP_ENABLED=${TERMINAL_BACKUP_ENABLED:-"true"}
TERMINAL_BACKUP_DIR=${TERMINAL_BACKUP_DIR:-"/tmp/sealos-backup/terminal-controller"}

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

add_set_string() {
  local key="$1"
  local value="$2"
  HELM_SET_ARGS+=(--set-string "${key}=${value}")
}

backup_ns_resource() {
  local kind="$1"
  local name="$2"
  if kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" >/dev/null 2>&1; then
    kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" -o yaml >> "${TERMINAL_BACKUP_FILE}"
    printf "\n---\n" >> "${TERMINAL_BACKUP_FILE}"
  fi
}

backup_cluster_resource() {
  local kind="$1"
  local name="$2"
  if kubectl get "${kind}" "${name}" >/dev/null 2>&1; then
    kubectl get "${kind}" "${name}" -o yaml >> "${TERMINAL_BACKUP_FILE}"
    printf "\n---\n" >> "${TERMINAL_BACKUP_FILE}"
  fi
}

backup_terminal_resources() {
  if [ "${TERMINAL_BACKUP_ENABLED}" != "true" ]; then
    return
  fi
  local ts
  ts=$(date +%Y%m%d%H%M%S)
  mkdir -p "${TERMINAL_BACKUP_DIR}"
  TERMINAL_BACKUP_FILE="${TERMINAL_BACKUP_DIR}/update-${ts}.yaml"
  : > "${TERMINAL_BACKUP_FILE}"

  backup_cluster_resource customresourcedefinition terminals.terminal.sealos.io
  backup_cluster_resource clusterrole terminal-manager-role
  backup_cluster_resource clusterrolebinding terminal-manager-rolebinding

  if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
    kubectl get namespace "${RELEASE_NAMESPACE}" -o yaml >> "${TERMINAL_BACKUP_FILE}"
    printf "\n---\n" >> "${TERMINAL_BACKUP_FILE}"
  fi
  backup_ns_resource configmap terminal-manager-config
  backup_ns_resource service terminal-controller-manager-metrics-service
  backup_ns_resource deployment terminal-controller-manager
  backup_ns_resource serviceaccount terminal-controller-manager
  backup_ns_resource role terminal-leader-election-role
  backup_ns_resource rolebinding terminal-leader-election-rolebinding
}

backup_terminal_resources

HELM_SET_ARGS=()

# Auto configure from sealos-config
SEALOS_CLOUD_DOMAIN=${SEALOS_CLOUD_DOMAIN:-"$(get_cm_value sealos-system sealos-config cloudDomain)"}
SEALOS_CLOUD_PORT=${SEALOS_CLOUD_PORT:-"$(get_cm_value sealos-system sealos-config cloudPort)"}

if [ -n "${SEALOS_CLOUD_DOMAIN}" ]; then
  add_set_string config.cloudDomain "${SEALOS_CLOUD_DOMAIN}"
fi

if [ -n "${SEALOS_CLOUD_PORT}" ]; then
  add_set_string config.cloudPort "${SEALOS_CLOUD_PORT}"
fi

if ! helm status "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
    kubectl label namespace "${RELEASE_NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl annotate namespace "${RELEASE_NAMESPACE}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi

  adopt_namespaced_resource configmap terminal-manager-config
  adopt_namespaced_resource service terminal-controller-manager-metrics-service
  adopt_namespaced_resource deployment terminal-controller-manager
  adopt_namespaced_resource serviceaccount terminal-controller-manager
  adopt_namespaced_resource role terminal-leader-election-role
  adopt_namespaced_resource rolebinding terminal-leader-election-rolebinding

  adopt_cluster_resource clusterrole terminal-manager-role
  adopt_cluster_resource clusterrolebinding terminal-manager-rolebinding
fi

helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" "${HELM_SET_ARGS[@]}" ${HELM_OPTS}
