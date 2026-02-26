#!/bin/bash
# job-init Helm 部署入口，负责安装/升级初始化 Job 资源。
set -ex

HELM_OPTS=${HELM_OPTS:-""}
RELEASE_NAME=${RELEASE_NAME:-"job-init"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"${DEFAULT_NAMESPACE:-account-system}"}
CHART_PATH=${CHART_PATH:-"./charts/job-init"}
JOB_NAME=${JOB_NAME:-"init-job"}
ADMIN_PASSWORD_CM_NAMESPACE="sealos-system"
ADMIN_PASSWORD_CM_NAME="sealos-cloud-admin"
ADMIN_PASSWORD_CM_KEY="PASSWORD"

add_set_string() {
  local key="$1"
  local value="$2"
  HELM_SET_ARGS+=(--set-string "${key}=${value}")
}

generate_random_password() {
  # 生成随机密码（大小写字母+数字+特殊字符）
  openssl rand -hex 24 | head -c 32
}

get_or_generate_admin_password() {
  local password="${ADMIN_PASSWORD:-}"

  # 如果已通过环境变量指定密码，直接使用
  if [ -n "${password}" ]; then
    echo "${password}"
    return
  fi

  # 尝试从 ConfigMap 读取已保存的密码
  if kubectl -n "${ADMIN_PASSWORD_CM_NAMESPACE}" get configmap "${ADMIN_PASSWORD_CM_NAME}" >/dev/null 2>&1; then
    local saved_password
    saved_password=$(kubectl -n "${ADMIN_PASSWORD_CM_NAMESPACE}" get configmap "${ADMIN_PASSWORD_CM_NAME}" -o "jsonpath={.data.${ADMIN_PASSWORD_CM_KEY}}" 2>/dev/null || true)
    if [ -n "${saved_password}" ]; then
      echo "${saved_password}"
      return
    fi
  fi

  # ConfigMap 不存在或密码为空，生成新密码并保存
  password=$(generate_random_password)

  # 创建或更新 ConfigMap
  if kubectl -n "${ADMIN_PASSWORD_CM_NAMESPACE}" get configmap "${ADMIN_PASSWORD_CM_NAME}" >/dev/null 2>&1; then
    # ConfigMap 已存在，更新密码
    kubectl -n "${ADMIN_PASSWORD_CM_NAMESPACE}" patch configmap "${ADMIN_PASSWORD_CM_NAME}" -p "{\"data\":{\"${ADMIN_PASSWORD_CM_KEY}\":\"${password}\"}}" >/dev/null 2>&1 || true
  else
    # ConfigMap 不存在，创建新的
    kubectl -n "${ADMIN_PASSWORD_CM_NAMESPACE}" create configmap "${ADMIN_PASSWORD_CM_NAME}" --from-literal="${ADMIN_PASSWORD_CM_KEY}=${password}" >/dev/null 2>&1 || true
  fi

  echo "${password}"
}

HELM_SET_ARGS=()

PASSWORD_SALT=$(kubectl get cm -n sealos-system sealos-config -o "jsonpath={.data.passwordSalt}" 2>/dev/null || true)
# 处理密码盐值
if [ -n "${PASSWORD_SALT:-}" ]; then
  add_set_string env.passwordSalt "${PASSWORD_SALT}"
fi

# 处理管理员密码（优先使用环境变量，否则从 ConfigMap 读取或生成随机密码）
ADMIN_PASSWORD=$(get_or_generate_admin_password)
add_set_string env.adminPassword "${ADMIN_PASSWORD}"

# 打印密码信息（如果是从 ConfigMap 读取或自动生成的）
echo "=========================================="
echo "Admin Password: ${ADMIN_PASSWORD}"
echo "Password saved to ConfigMap: ${ADMIN_PASSWORD_CM_NAME} in namespace ${ADMIN_PASSWORD_CM_NAMESPACE}"
echo "Retrieve with: kubectl get cm ${ADMIN_PASSWORD_CM_NAME} -n ${ADMIN_PASSWORD_CM_NAMESPACE} -o jsonpath='{.data.${ADMIN_PASSWORD_CM_KEY}}'"
echo "=========================================="

if [ -n "${ADMIN_USER_NAME:-}" ]; then
  add_set_string env.adminUserName "${ADMIN_USER_NAME}"
fi
if [ -n "${WORKSPACE_PREFIX:-}" ]; then
  add_set_string env.workspacePrefix "${WORKSPACE_PREFIX}"
fi
if [ -n "${ENV_FROM_CONFIGMAP:-}" ]; then
  add_set_string env.envFromConfigMap "${ENV_FROM_CONFIGMAP}"
fi

if [ -n "${JOB_INIT_SERVICE_ACCOUNT:-}" ]; then
  add_set_string serviceAccount.name "${JOB_INIT_SERVICE_ACCOUNT}"
fi

SEALOS_CLOUD_DOMAIN=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudDomain}')
varDatabaseGlobalCockroachdbURI=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.databaseGlobalCockroachdbURI}')
varDatabaseLocalCockroachdbURI=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.databaseLocalCockroachdbURI}')
varRegionUID=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.regionUID}')

add_set_string env.domain "${SEALOS_CLOUD_DOMAIN}"
add_set_string env.globalCockroachUri "${varDatabaseGlobalCockroachdbURI}"
add_set_string env.localCockroachUri "${varDatabaseLocalCockroachdbURI}"
add_set_string env.localRegion "${varRegionUID}"

if kubectl -n "${RELEASE_NAMESPACE}" get job "${JOB_NAME}" >/dev/null 2>&1; then
  kubectl -n "${RELEASE_NAMESPACE}" delete job "${JOB_NAME}" --ignore-not-found --wait=true
fi

helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" "${HELM_SET_ARGS[@]}" ${HELM_OPTS}
