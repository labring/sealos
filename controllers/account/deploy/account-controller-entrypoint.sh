#!/bin/bash
set -ex

HELM_OPTS=${HELM_OPTS:-""}
RELEASE_NAME=${RELEASE_NAME:-"account-controller"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"account-system"}
CHART_PATH=${CHART_PATH:-"./charts/account-controller"}
ACCOUNT_ENV_MERGE_STRATEGY=${ACCOUNT_ENV_MERGE_STRATEGY:-"overwrite"}
ACCOUNT_BACKUP_ENABLED=${ACCOUNT_BACKUP_ENABLED:-"true"}
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

# 执行备份
backup_account_resources

HELM_SET_ARGS=()

AUTO_CONFIG_HELM_OPTS=""

CLOUD_DOMAIN=$(get_cm_value sealos-system sealos-config cloudDomain)
CLOUD_PORT=$(get_cm_value sealos-system sealos-config cloudPort)
JWT_INTERNAL=$(get_cm_value sealos-system sealos-config jwtInternal)
REGION_UID=$(get_cm_value sealos-system sealos-config regionUID)
GLOBAL_COCKROACH_URI=$(get_cm_value sealos-system sealos-config databaseGlobalCockroachdbURI)
LOCAL_COCKROACH_URI=$(get_cm_value sealos-system sealos-config databaseLocalCockroachdbURI)
MONGODB_URI=$(get_cm_value sealos-system sealos-config databaseMongodbURI)

TRAFFIC_MONGO=$(get_cm_value sealos-system nm-agent-config MONGO_URI)
if [ -z "${TRAFFIC_MONGO}" ] && [ -n "${MONGODB_URI}" ]; then
  TRAFFIC_MONGO="${MONGODB_URI}"
fi

[ -n "${CLOUD_DOMAIN}" ] && AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string accountEnv.cloudDomain=${CLOUD_DOMAIN}"
[ -n "${CLOUD_PORT}" ] && AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string accountEnv.cloudPort=${CLOUD_PORT}"
[ -n "${JWT_INTERNAL}" ] && AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string accountEnv.accountApiJwtSecret=${JWT_INTERNAL}"
[ -n "${REGION_UID}" ] && AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string accountEnv.localRegion=${REGION_UID}"
[ -n "${GLOBAL_COCKROACH_URI}" ] && AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string accountEnv.globalCockroachURI=${GLOBAL_COCKROACH_URI}"
[ -n "${LOCAL_COCKROACH_URI}" ] && AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string accountEnv.localCockroachURI=${LOCAL_COCKROACH_URI}"
[ -n "${MONGODB_URI}" ] && AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string accountEnv.mongoURI=${MONGODB_URI}"
[ -n "${TRAFFIC_MONGO}" ] && AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string accountEnv.trafficMongoURI=${TRAFFIC_MONGO}"


if [ -n "${CLOUD_DOMAIN}" ]; then
  AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string accountEnv.whitelistKubernetesHosts=https://${CLOUD_DOMAIN}:6443"
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

# Prepare values files
SERVICE_NAME="account-controller"
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
