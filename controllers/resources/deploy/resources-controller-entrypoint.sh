#!/bin/bash
set -ex

HELM_OPTS=${HELM_OPTS:-""}
RELEASE_NAME=${RELEASE_NAME:-"resources"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"resources-system"}
CHART_PATH=${CHART_PATH:-"./charts/resources-controller"}
RESOURCES_ENV_AUTO_CONFIG_ENABLED=${RESOURCES_ENV_AUTO_CONFIG_ENABLED:-"true"}
RESOURCES_BACKUP_ENABLED=${RESOURCES_BACKUP_ENABLED:-"true"}
RESOURCES_BACKUP_DIR=${RESOURCES_BACKUP_DIR:-"/tmp/sealos-backup/resources-controller"}
DEPLOYMENT_NAME=${DEPLOYMENT_NAME:-"${RELEASE_NAME}-controller-manager"}

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

backup_resources() {
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
  backup_ns_resource secret mongo-secret
  backup_ns_resource service resources-controller-manager-metrics-service
  backup_ns_resource deployment resources-controller-manager
  backup_ns_resource serviceaccount resources-controller-manager
  backup_ns_resource role resources-leader-election-role
  backup_ns_resource rolebinding resources-leader-election-rolebinding
  backup_ns_resource issuer selfsigned-issuer
  backup_ns_resource certificate metrics-certs
}

backup_resources

cleanup_deployment_env() {
  local candidate
  for candidate in "${DEPLOYMENT_NAME}" "${RELEASE_NAME}-resources-controller-manager" "resources-controller-manager"; do
    if kubectl -n "${RELEASE_NAMESPACE}" get deployment "${candidate}" >/dev/null 2>&1; then
      kubectl -n "${RELEASE_NAMESPACE}" set env deployment/"${candidate}" MONGO_URI- TRAFFIC_MONGO_URI- --containers=manager >/dev/null 2>&1 || true
      return
    fi
  done
}

cleanup_deployment_env

HELM_SET_ARGS=()
if [ -f "/root/.sealos/cloud/sealos.env" ]; then
  source /root/.sealos/cloud/sealos.env
fi

if [ "${RESOURCES_ENV_AUTO_CONFIG_ENABLED}" = "true" ]; then
  varDatabaseMongodbURI=${varDatabaseMongodbURI:-"$(get_cm_value sealos-system sealos-config databaseMongodbURI)"}
  trafficMONGO=$(get_cm_value sealos-system nm-agent-config MONGO_URI)
  if [ -z "${trafficMONGO}" ]; then
    trafficMONGO="${varDatabaseMongodbURI}"
  fi

  if [ -z "${RESOURCES_MONGO_URI}" ] && [ -n "${MONGO_URI}" ]; then
    RESOURCES_MONGO_URI="${MONGO_URI}"
  fi
  if [ -z "${RESOURCES_TRAFFIC_MONGO_URI}" ] && [ -n "${TRAFFIC_MONGO_URI}" ]; then
    RESOURCES_TRAFFIC_MONGO_URI="${TRAFFIC_MONGO_URI}"
  fi
  RESOURCES_MONGO_URI=${RESOURCES_MONGO_URI:-"${varDatabaseMongodbURI}"}
  RESOURCES_TRAFFIC_MONGO_URI=${RESOURCES_TRAFFIC_MONGO_URI:-"${trafficMONGO}"}

  add_set_string secret.mongoURI "${RESOURCES_MONGO_URI}"
  add_set_string secret.trafficMongoURI "${RESOURCES_TRAFFIC_MONGO_URI}"
  if [ -n "${RESOURCES_TRAFFICS_SERVICE_CONNECT_ADDRESS}" ]; then
    add_set_string secret.trafficsServiceConnectAddress "${RESOURCES_TRAFFICS_SERVICE_CONNECT_ADDRESS}"
  fi
fi

if ! helm status "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
    kubectl label namespace "${RELEASE_NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl annotate namespace "${RELEASE_NAMESPACE}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi

  adopt_namespaced_resource configmap resources-manager-config
  adopt_namespaced_resource secret mongo-secret
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

helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" "${HELM_SET_ARGS[@]}" ${HELM_OPTS}
