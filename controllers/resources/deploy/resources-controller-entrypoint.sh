#!/bin/bash
set -ex

HELM_OPTS=${HELM_OPTS:-""}
RELEASE_NAME=${RELEASE_NAME:-"resources-controller"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"resources-system"}
CHART_PATH=${CHART_PATH:-"./charts/resources-controller"}
RESOURCES_ENV_MERGE_STRATEGY=${RESOURCES_ENV_MERGE_STRATEGY:-"overwrite"}
RESOURCES_BACKUP_ENABLED=${RESOURCES_BACKUP_ENABLED:-"true"}
RESOURCES_BACKUP_DIR=${RESOURCES_BACKUP_DIR:-"/tmp/sealos-backup/resources-controller"}

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
    kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" -o yaml >> "${RESOURCES_BACKUP_FILE}"
    printf "\n---\n" >> "${RESOURCES_BACKUP_FILE}"
  fi
}

backup_cluster_resource() {
  local kind="$1"
  local name="$2"
  if kubectl get "${kind}" "${name}" >/dev/null 2>&1; then
    kubectl get "${kind}" "${name}" -o yaml >> "${RESOURCES_BACKUP_FILE}"
    printf "\n---\n" >> "${RESOURCES_BACKUP_FILE}"
  fi
}

backup_resources_resources() {
  if [ "${RESOURCES_BACKUP_ENABLED}" != "true" ]; then
    return
  fi
  local ts
  ts=$(date +%Y%m%d%H%M%S)
  mkdir -p "${RESOURCES_BACKUP_DIR}"
  RESOURCES_BACKUP_FILE="${RESOURCES_BACKUP_DIR}/update-${ts}.yaml"
  : > "${RESOURCES_BACKUP_FILE}"

  backup_cluster_resource clusterrole resources-manager-role
  backup_cluster_resource clusterrole resources-metrics-reader
  backup_cluster_resource clusterrole resources-proxy-role
  backup_cluster_resource clusterrolebinding resources-manager-rolebinding
  backup_cluster_resource clusterrolebinding resources-proxy-rolebinding

  if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
    kubectl get namespace "${RELEASE_NAMESPACE}" -o yaml >> "${RESOURCES_BACKUP_FILE}"
    printf "\n---\n" >> "${RESOURCES_BACKUP_FILE}"
  fi
  backup_ns_resource configmap resources-manager-config
  backup_ns_resource configmap resources-config
  backup_ns_resource service resources-controller-manager-metrics-service
  backup_ns_resource deployment resources-controller-manager
  backup_ns_resource serviceaccount resources-controller-manager
  backup_ns_resource role resources-leader-election-role
  backup_ns_resource rolebinding resources-leader-election-rolebinding
  backup_ns_resource issuer selfsigned-issuer
  backup_ns_resource certificate metrics-certs
}

# 执行备份
backup_resources_resources

HELM_SET_ARGS=()

AUTO_CONFIG_HELM_OPTS=""

MONGODB_URI=$(get_cm_value sealos-system sealos-config databaseMongodbURI)
MINIO_USER=$(get_cm_value sealos-system objectstorage-config MINIO_ROOT_USER)
MINIO_PASSWORD=$(get_cm_value sealos-system objectstorage-config MINIO_ROOT_PASSWORD)

TRAFFIC_MONGO=$(get_cm_value sealos-system nm-agent-config MONGO_URI)
if [ -z "${TRAFFIC_MONGO}" ] && [ -n "${MONGODB_URI}" ]; then
  TRAFFIC_MONGO="${MONGODB_URI}"
fi

[ -n "${MONGODB_URI}" ] && AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string configmap.mongoURI=${MONGODB_URI}"
[ -n "${TRAFFIC_MONGO}" ] && AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string configmap.trafficMongoURI=${TRAFFIC_MONGO}"
[ -n "${MINIO_USER}" ] && AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string configmap.minioAK=${MINIO_USER}"
[ -n "${MINIO_PASSWORD}" ] && AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string configmap.minioSK=${MINIO_PASSWORD}"

if ! helm status "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
    kubectl label namespace "${RELEASE_NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl annotate namespace "${RELEASE_NAMESPACE}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi

  adopt_namespaced_resource configmap resources-manager-config
  adopt_namespaced_resource configmap resources-config
  adopt_namespaced_resource service resources-controller-manager-metrics-service
  adopt_namespaced_resource deployment resources-controller-manager
  adopt_namespaced_resource serviceaccount resources-controller-manager
  adopt_namespaced_resource role resources-leader-election-role
  adopt_namespaced_resource rolebinding resources-leader-election-rolebinding
  adopt_namespaced_resource issuer selfsigned-issuer
  adopt_namespaced_resource certificate metrics-certs

  adopt_cluster_resource clusterrole resources-manager-role
  adopt_cluster_resource clusterrole resources-metrics-reader
  adopt_cluster_resource clusterrole resources-proxy-role
  adopt_cluster_resource clusterrolebinding resources-manager-rolebinding
  adopt_cluster_resource clusterrolebinding resources-proxy-rolebinding
fi

if [ -n "${RESOURCES_ENV_MERGE_STRATEGY}" ]; then
  HELM_SET_ARGS+=(--set-string "configmapMergeStrategy=${RESOURCES_ENV_MERGE_STRATEGY}")
fi

# Prepare values files
SERVICE_NAME="resources-controller"
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
