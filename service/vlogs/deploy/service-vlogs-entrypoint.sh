#!/bin/bash
set -euo pipefail

HELM_OPTS=${HELM_OPTS:-""}
HELM_OPTIONS=${HELM_OPTIONS:-""}
RELEASE_NAME=${RELEASE_NAME:-"service-vlogs"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"sealos"}
CHART_PATH=${CHART_PATH:-"./charts/service-vlogs"}
LEGACY_MANIFEST=${LEGACY_MANIFEST:-"./manifests/deploy.yaml"}
SERVICE_NAME="service-vlogs"
USER_VALUES_PATH="/root/.sealos/cloud/values/core/${SERVICE_NAME}-monitor-values.yaml"
TOOLS_FILE=${TOOLS_FILE:-"/root/.sealos/cloud/scripts/tools.sh"}

get_cm_value() {
  local namespace="$1"
  local name="$2"
  local key="$3"
  kubectl get configmap "${name}" -n "${namespace}" -o "jsonpath={.data.${key}}" 2>/dev/null || true
}

load_cloud_tools_or_exit() {
  local required_functions=(
    ensure_global_values_ready_for_component
    global_http_effective_port
    global_http_scheme
  )
  local missing_functions=()
  local function_name

  if [ ! -f "${TOOLS_FILE}" ]; then
    cat >&2 <<EOF
错误：未找到 ${TOOLS_FILE}，当前组件镜像无法继续执行。

请先回到当前安装包目录，执行对应命令同步 values + tools：
  Pro 安装包：./sealos-pro.sh sync-config
  OSS 安装包：./sealos-oss.sh sync-config
EOF
    exit 1
  fi

  if [ "${TOOLS_FILE}" = "/root/.sealos/cloud/scripts/tools.sh" ]; then
    # shellcheck source=/root/.sealos/cloud/scripts/tools.sh
    source /root/.sealos/cloud/scripts/tools.sh
  else
    # shellcheck source=/dev/null
    source "${TOOLS_FILE}"
  fi

  for function_name in "${required_functions[@]}"; do
    if ! declare -f "${function_name}" >/dev/null 2>&1; then
      missing_functions+=("${function_name}")
    fi
  done

  if [ "${#missing_functions[@]}" -gt 0 ]; then
    cat >&2 <<EOF
错误：${TOOLS_FILE} 版本过旧，缺少配置检测函数，当前组件镜像无法继续执行。

缺少函数：${missing_functions[*]}

请先回到当前安装包目录，执行对应命令同步 values + tools：
  Pro 安装包：./sealos-pro.sh sync-config
  OSS 安装包：./sealos-oss.sh sync-config
EOF
    exit 1
  fi

  ensure_global_values_ready_for_component
}

HELM_EXTRA_ARGS=()

if [ -n "${HELM_OPTIONS}" ]; then
  read -r -a PARSED_HELM_OPTIONS <<< "${HELM_OPTIONS}"
  HELM_EXTRA_ARGS+=("${PARSED_HELM_OPTIONS[@]}")
fi

if [ -n "${HELM_OPTS}" ]; then
  read -r -a PARSED_HELM_OPTS <<< "${HELM_OPTS}"
  HELM_EXTRA_ARGS+=("${PARSED_HELM_OPTS[@]}")
fi

load_cloud_tools_or_exit

varCloudDomain=$(get_cm_value sealos-system sealos-config cloudDomain)
varCloudScheme="$(global_http_scheme)"
varCloudPort="$(global_http_effective_port)"
varCloudScheme=${varCloudScheme:-https}
varCloudScheme="${varCloudScheme%://}"
varCloudPort="${varCloudPort#:}"
varCloudUrl="${varCloudScheme}://${varCloudDomain}"

if [ -n "${varCloudPort}" ]; then
  varCloudUrl="${varCloudUrl}:${varCloudPort}"
fi

vlogs_usr_select_USER="$(get_cm_value sealos-system vlogs-config-user SELECT_USER)"
vlogs_usr_select_PASSWORD="$(get_cm_value sealos-system vlogs-config-user SELECT_PASSWORD)"

if [ -z "${varCloudDomain}" ] || [ -z "${vlogs_usr_select_USER}" ] || [ -z "${vlogs_usr_select_PASSWORD}" ]; then
  echo "missing sealos-config or vlogs-config-user values" >&2
  exit 1
fi

AUTO_CONFIG_HELM_OPTS=(
  --set-string "serviceVlogsConfig.path=http://usr-vlc-victoria-logs-cluster-vmauth.vlc.svc:8427"
  --set-string "serviceVlogsConfig.username=${vlogs_usr_select_USER}"
  --set-string "serviceVlogsConfig.password=${vlogs_usr_select_PASSWORD}"
  --set-string "serviceVlogsConfig.whitelistKubernetesHosts=${varCloudUrl}"
)

if ! helm status "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  if [ -f "${LEGACY_MANIFEST}" ]; then
    kubectl delete -f "${LEGACY_MANIFEST}" --ignore-not-found=true >/dev/null 2>&1 || true
  fi
fi

if [ ! -f "${USER_VALUES_PATH}" ]; then
  mkdir -p "$(dirname "${USER_VALUES_PATH}")"
  cp "./charts/${SERVICE_NAME}/${SERVICE_NAME}-monitor-values.yaml" "${USER_VALUES_PATH}"
fi

helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" \
  -f "./charts/${SERVICE_NAME}/values.yaml" \
  -f "${USER_VALUES_PATH}" \
  "${AUTO_CONFIG_HELM_OPTS[@]}" \
  "${HELM_EXTRA_ARGS[@]}"
