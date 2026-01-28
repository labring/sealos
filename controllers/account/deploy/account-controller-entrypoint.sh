#!/bin/bash
set -ex

HELM_OPTS=${HELM_OPTS:-""}
RELEASE_NAME=${RELEASE_NAME:-"account"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"account-system"}
CHART_PATH=${CHART_PATH:-"./charts/account-controller"}
ACCOUNT_ENV_MERGE_STRATEGY=${ACCOUNT_ENV_MERGE_STRATEGY:-"overwrite"}
ACCOUNT_ENV_AUTO_CONFIG_ENABLED=${ACCOUNT_ENV_AUTO_CONFIG_ENABLED:-"true"}
ACCOUNT_BACKUP_ENABLED=${ACCOUNT_BACKUP_ENABLED:-"false"}
ACCOUNT_BACKUP_DIR=${ACCOUNT_BACKUP_DIR:-"/tmp/sealos-backup/account-controller"}

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
    kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" -o yaml >> "${ACCOUNT_BACKUP_FILE}"
    printf "\n---\n" >> "${ACCOUNT_BACKUP_FILE}"
  fi
}

backup_cluster_resource() {
  local kind="$1"
  local name="$2"
  if kubectl get "${kind}" "${name}" >/dev/null 2>&1; then
    kubectl get "${kind}" "${name}" -o yaml >> "${ACCOUNT_BACKUP_FILE}"
    printf "\n---\n" >> "${ACCOUNT_BACKUP_FILE}"
  fi
}

backup_account_resources() {
  if [ "${ACCOUNT_BACKUP_ENABLED}" != "true" ]; then
    return
  fi
  local ts
  ts=$(date +%Y%m%d%H%M%S)
  mkdir -p "${ACCOUNT_BACKUP_DIR}"
  ACCOUNT_BACKUP_FILE="${ACCOUNT_BACKUP_DIR}/update-${ts}.yaml"
  : > "${ACCOUNT_BACKUP_FILE}"

  backup_cluster_resource customresourcedefinition debts.account.sealos.io
  backup_cluster_resource customresourcedefinition payments.account.sealos.io
  backup_cluster_resource clusterrole account-manager-role
  backup_cluster_resource clusterrole account-metrics-reader
  backup_cluster_resource clusterrole account-proxy-role
  backup_cluster_resource clusterrolebinding account-manager-rolebinding
  backup_cluster_resource clusterrolebinding account-proxy-rolebinding
  backup_cluster_resource validatingwebhookconfiguration account-validating-webhook-configuration

  if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
    kubectl get namespace "${RELEASE_NAMESPACE}" -o yaml >> "${ACCOUNT_BACKUP_FILE}"
    printf "\n---\n" >> "${ACCOUNT_BACKUP_FILE}"
  fi
  backup_ns_resource configmap account-manager-config
  backup_ns_resource configmap account-manager-env
  backup_ns_resource service account-controller-manager-metrics-service
  backup_ns_resource service account-webhook-service
  backup_ns_resource deployment account-controller-manager
  backup_ns_resource serviceaccount account-controller-manager
  backup_ns_resource role account-leader-election-role
  backup_ns_resource rolebinding account-leader-election-rolebinding
  backup_ns_resource issuer account-selfsigned-issuer
  backup_ns_resource certificate account-serving-cert
}

backup_account_resources

HELM_SET_ARGS=()
if [ -f "/root/.sealos/cloud/sealos.env" ]; then
  source /root/.sealos/cloud/sealos.env
fi

if [ "${ACCOUNT_ENV_AUTO_CONFIG_ENABLED}" = "true" ]; then
  SEALOS_CLOUD_DOMAIN=${SEALOS_CLOUD_DOMAIN:-"$(get_cm_value sealos-system sealos-config cloudDomain)"}
  SEALOS_CLOUD_PORT=${SEALOS_CLOUD_PORT:-"$(get_cm_value sealos-system sealos-config cloudPort)"}
  varJwtInternal=${varJwtInternal:-"$(get_cm_value sealos-system sealos-config jwtInternal)"}
  varRegionUID=${varRegionUID:-"$(get_cm_value sealos-system sealos-config regionUID)"}
  varDatabaseGlobalCockroachdbURI=${varDatabaseGlobalCockroachdbURI:-"$(get_cm_value sealos-system sealos-config databaseGlobalCockroachdbURI)"}
  varDatabaseLocalCockroachdbURI=${varDatabaseLocalCockroachdbURI:-"$(get_cm_value sealos-system sealos-config databaseLocalCockroachdbURI)"}
  varDatabaseMongodbURI=${varDatabaseMongodbURI:-"$(get_cm_value sealos-system sealos-config databaseMongodbURI)"}
  trafficMONGO=$(get_cm_value sealos-system nm-agent-config MONGO_URI)
  if [ -z "${trafficMONGO}" ]; then
    trafficMONGO="${varDatabaseMongodbURI}"
  fi

  ACCOUNT_ENV_OS_ADMIN_SECRET=${ACCOUNT_ENV_OS_ADMIN_SECRET:-"object-storage-user-0"}
  ACCOUNT_ENV_OS_INTERNAL_ENDPOINT=${ACCOUNT_ENV_OS_INTERNAL_ENDPOINT:-"object-storage.objectstorage-system.svc"}
  ACCOUNT_ENV_OS_NAMESPACE=${ACCOUNT_ENV_OS_NAMESPACE:-"objectstorage-system"}
  ACCOUNT_ENV_REWARD_PROCESSING=${ACCOUNT_ENV_REWARD_PROCESSING:-"false"}
  ACCOUNT_ENV_LIMIT_RANGE_EPHEMERAL_STORAGE=${ACCOUNT_ENV_LIMIT_RANGE_EPHEMERAL_STORAGE:-"0"}
  ACCOUNT_ENV_QUOTA_LIMITS_CPU=${ACCOUNT_ENV_QUOTA_LIMITS_CPU:-"16"}
  ACCOUNT_ENV_QUOTA_LIMITS_MEMORY=${ACCOUNT_ENV_QUOTA_LIMITS_MEMORY:-"64Gi"}
  ACCOUNT_ENV_QUOTA_LIMITS_STORAGE=${ACCOUNT_ENV_QUOTA_LIMITS_STORAGE:-"200Gi"}
  ACCOUNT_ENV_QUOTA_LIMITS_GPU=${ACCOUNT_ENV_QUOTA_LIMITS_GPU:-"8"}
  ACCOUNT_ENV_QUOTA_LIMITS_PODS=${ACCOUNT_ENV_QUOTA_LIMITS_PODS:-"20"}
  ACCOUNT_ENV_QUOTA_LIMITS_NODE_PORTS=${ACCOUNT_ENV_QUOTA_LIMITS_NODE_PORTS:-"10"}
  ACCOUNT_ENV_QUOTA_OBJECT_STORAGE_SIZE=${ACCOUNT_ENV_QUOTA_OBJECT_STORAGE_SIZE:-"20Gi"}
  ACCOUNT_ENV_QUOTA_OBJECT_STORAGE_BUCKET=${ACCOUNT_ENV_QUOTA_OBJECT_STORAGE_BUCKET:-"20"}

  add_set_string accountEnv.accountApiJwtSecret "${varJwtInternal}"
  add_set_string accountEnv.cloudDomain "${SEALOS_CLOUD_DOMAIN}"
  add_set_string accountEnv.cloudPort "${SEALOS_CLOUD_PORT}"
  add_set_string accountEnv.globalCockroachURI "${varDatabaseGlobalCockroachdbURI}"
  add_set_string accountEnv.localCockroachURI "${varDatabaseLocalCockroachdbURI}"
  add_set_string accountEnv.mongoURI "${varDatabaseMongodbURI}"
  add_set_string accountEnv.trafficMongoURI "${trafficMONGO}"
  add_set_string accountEnv.localRegion "${varRegionUID}"
  add_set_string accountEnv.osAdminSecret "${ACCOUNT_ENV_OS_ADMIN_SECRET}"
  add_set_string accountEnv.osInternalEndpoint "${ACCOUNT_ENV_OS_INTERNAL_ENDPOINT}"
  add_set_string accountEnv.osNamespace "${ACCOUNT_ENV_OS_NAMESPACE}"
  add_set_string accountEnv.rewardProcessing "${ACCOUNT_ENV_REWARD_PROCESSING}"
  add_set_string accountEnv.limitRangeEphemeralStorage "${ACCOUNT_ENV_LIMIT_RANGE_EPHEMERAL_STORAGE}"
  add_set_string accountEnv.quotaLimitsCpu "${ACCOUNT_ENV_QUOTA_LIMITS_CPU}"
  add_set_string accountEnv.quotaLimitsMemory "${ACCOUNT_ENV_QUOTA_LIMITS_MEMORY}"
  add_set_string accountEnv.quotaLimitsStorage "${ACCOUNT_ENV_QUOTA_LIMITS_STORAGE}"
  add_set_string accountEnv.quotaLimitsGpu "${ACCOUNT_ENV_QUOTA_LIMITS_GPU}"
  add_set_string accountEnv.quotaLimitsPods "${ACCOUNT_ENV_QUOTA_LIMITS_PODS}"
  add_set_string accountEnv.quotaLimitsNodePorts "${ACCOUNT_ENV_QUOTA_LIMITS_NODE_PORTS}"
  add_set_string accountEnv.quotaObjectStorageSize "${ACCOUNT_ENV_QUOTA_OBJECT_STORAGE_SIZE}"
  add_set_string accountEnv.quotaObjectStorageBucket "${ACCOUNT_ENV_QUOTA_OBJECT_STORAGE_BUCKET}"
  if [ -n "${SEALOS_CLOUD_DOMAIN}" ]; then
    add_set_string accountEnv.whitelistKubernetesHosts "https://${SEALOS_CLOUD_DOMAIN}:6443"
  fi
fi

if ! helm status "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
    kubectl label namespace "${RELEASE_NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl annotate namespace "${RELEASE_NAMESPACE}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi

  adopt_namespaced_resource configmap account-manager-config
  adopt_namespaced_resource configmap account-manager-env
  adopt_namespaced_resource service account-controller-manager-metrics-service
  adopt_namespaced_resource service account-webhook-service
  adopt_namespaced_resource deployment account-controller-manager
  adopt_namespaced_resource serviceaccount account-controller-manager
  adopt_namespaced_resource role account-leader-election-role
  adopt_namespaced_resource rolebinding account-leader-election-rolebinding
  adopt_namespaced_resource issuer account-selfsigned-issuer
  adopt_namespaced_resource certificate account-serving-cert

  adopt_cluster_resource clusterrole account-manager-role
  adopt_cluster_resource clusterrole account-metrics-reader
  adopt_cluster_resource clusterrole account-proxy-role
  adopt_cluster_resource clusterrolebinding account-manager-rolebinding
  adopt_cluster_resource clusterrolebinding account-proxy-rolebinding
  adopt_cluster_resource validatingwebhookconfiguration account-validating-webhook-configuration
fi

if [ -n "${ACCOUNT_ENV_MERGE_STRATEGY}" ]; then
  HELM_SET_ARGS+=(--set-string "accountEnvMergeStrategy=${ACCOUNT_ENV_MERGE_STRATEGY}")
fi

helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" "${HELM_SET_ARGS[@]}" ${HELM_OPTS}
