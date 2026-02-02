#!/bin/bash
# job-init Helm 部署入口，负责安装/升级初始化 Job 资源。
set -ex

HELM_OPTS=${HELM_OPTS:-""}
RELEASE_NAME=${RELEASE_NAME:-"job-init"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"${DEFAULT_NAMESPACE:-account-system}"}
CHART_PATH=${CHART_PATH:-"./charts/job-init"}
JOB_NAME=${JOB_NAME:-"init-job"}

add_set_string() {
  local key="$1"
  local value="$2"
  HELM_SET_ARGS+=(--set-string "${key}=${value}")
}

HELM_SET_ARGS=()

if [ -n "${PASSWORD_SALT:-}" ]; then
  add_set_string env.passwordSalt "${PASSWORD_SALT}"
fi
if [ -n "${ADMIN_PASSWORD:-}" ]; then
  add_set_string env.adminPassword "${ADMIN_PASSWORD}"
fi
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

if kubectl -n "${RELEASE_NAMESPACE}" get job "${JOB_NAME}" >/dev/null 2>&1; then
  kubectl -n "${RELEASE_NAMESPACE}" delete job "${JOB_NAME}" --ignore-not-found --wait=true
fi

helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" "${HELM_SET_ARGS[@]}" ${HELM_OPTS}
