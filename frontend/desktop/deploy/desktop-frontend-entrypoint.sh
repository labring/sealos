#!/bin/bash
set -euo pipefail

RELEASE_NAME=${RELEASE_NAME:-"desktop-frontend"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"sealos"}
CHART_PATH=${CHART_PATH:-"./charts/desktop-frontend"}
AUTO_CONFIG_ENABLED=${AUTO_CONFIG_ENABLED:-"true"}
SERVICE_NAME="desktop-frontend"
USER_VALUES_PATH="/root/.sealos/cloud/values/core/desktop-values.yaml"
TOOLS_FILE=${TOOLS_FILE:-"/root/.sealos/cloud/scripts/tools.sh"}

AUTO_CONFIG_HELM_ARGS=()
ENFORCED_CONFIG_HELM_ARGS=()
HELM_EXTRA_ARGS=()
if [ -n "${HELM_OPTIONS:-}" ]; then
  read -r -a PARSED_HELM_OPTIONS <<< "${HELM_OPTIONS}"
  HELM_EXTRA_ARGS+=("${PARSED_HELM_OPTIONS[@]}")
fi
if [ -n "${HELM_OPTS:-}" ]; then
  read -r -a PARSED_HELM_OPTS <<< "${HELM_OPTS}"
  HELM_EXTRA_ARGS+=("${PARSED_HELM_OPTS[@]}")
fi

get_cm_value() {
  local namespace="$1"
  local name="$2"
  local key="$3"
  kubectl get configmap "${name}" -n "${namespace}" -o "jsonpath={.data.${key}}" 2>/dev/null || true
}

load_cloud_tools_or_exit() {
  local required_functions=(
    ensure_global_values_ready_for_component
    fetch_configmap_data_key
    global_http_disable_https
    global_http_external_url
    info
    read_cert_tls_reject_unauthorized
    read_jwt_internal
    read_yaml_file_path
    warn
  )
  local missing_functions=()
  local function_name

  if [ ! -f "${TOOLS_FILE}" ]; then
    cat >&2 <<EOF
错误：未找到 ${TOOLS_FILE}，当前组件镜像无法继续执行。

请先回到当前安装包目录，执行对应命令同步 values + tools：
  Pro 安装包：./sealos-pro.sh sync-config
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
EOF
    exit 1
  fi

  ensure_global_values_ready_for_component
}

add_set_string() {
  local key="$1"
  local value="$2"
  if [ -n "${value}" ]; then
    AUTO_CONFIG_HELM_ARGS+=(--set-string "${key}=${value}")
  fi
}

add_enforced_set_string() {
  local key="$1"
  local value="$2"
  if [ -n "${value}" ]; then
    ENFORCED_CONFIG_HELM_ARGS+=(--set-string "${key}=${value}")
  fi
}

load_cloud_tools_or_exit
tls_reject_unauthorized="$(read_cert_tls_reject_unauthorized)"
add_enforced_set_string desktopConfig.tlsRejectUnauthorized "${tls_reject_unauthorized}"

adopt_namespaced_resource() {
  local kind="$1"
  local name="$2"
  if ! kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" >/dev/null 2>&1; then
    return 0
  fi

  local ownership managed_by owner_release owner_namespace
  ownership=$(kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" \
    -o jsonpath='{.metadata.labels.app\.kubernetes\.io/managed-by}{"|"}{.metadata.annotations.meta\.helm\.sh/release-name}{"|"}{.metadata.annotations.meta\.helm\.sh/release-namespace}')
  IFS='|' read -r managed_by owner_release owner_namespace <<< "${ownership}"
  if { [ "${managed_by}" = "Helm" ] || [ -n "${owner_release}" ] || [ -n "${owner_namespace}" ]; } && \
    { [ "${owner_release}" != "${RELEASE_NAME}" ] || [ "${owner_namespace}" != "${RELEASE_NAMESPACE}" ]; }; then
    echo "Refusing to adopt ${kind} ${RELEASE_NAMESPACE}/${name}: owned by Helm release ${owner_namespace}/${owner_release}" >&2
    return 1
  fi
  if [ "${managed_by}" = "Helm" ]; then
    return 0
  fi

  echo "Adopting ${kind} ${RELEASE_NAMESPACE}/${name}..."
  kubectl -n "${RELEASE_NAMESPACE}" label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null
  kubectl -n "${RELEASE_NAMESPACE}" annotate "${kind}" "${name}" \
    meta.helm.sh/release-name="${RELEASE_NAME}" \
    meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null
}

adopt_cluster_resource() {
  local kind="$1"
  local name="$2"
  if ! kubectl get "${kind}" "${name}" >/dev/null 2>&1; then
    return 0
  fi

  local ownership managed_by owner_release owner_namespace
  ownership=$(kubectl get "${kind}" "${name}" \
    -o jsonpath='{.metadata.labels.app\.kubernetes\.io/managed-by}{"|"}{.metadata.annotations.meta\.helm\.sh/release-name}{"|"}{.metadata.annotations.meta\.helm\.sh/release-namespace}')
  IFS='|' read -r managed_by owner_release owner_namespace <<< "${ownership}"
  if { [ "${managed_by}" = "Helm" ] || [ -n "${owner_release}" ] || [ -n "${owner_namespace}" ]; } && \
    { [ "${owner_release}" != "${RELEASE_NAME}" ] || [ "${owner_namespace}" != "${RELEASE_NAMESPACE}" ]; }; then
    echo "Refusing to adopt ${kind} ${name}: owned by Helm release ${owner_namespace}/${owner_release}" >&2
    return 1
  fi
  if [ "${managed_by}" = "Helm" ]; then
    return 0
  fi

  echo "Adopting ${kind} ${name}..."
  kubectl label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null
  kubectl annotate "${kind}" "${name}" \
    meta.helm.sh/release-name="${RELEASE_NAME}" \
    meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null
}

if [ "${AUTO_CONFIG_ENABLED}" = "true" ]; then
  echo "Auto-configuring from sealos-system/sealos-config..."

  SEALOS_CLOUD_DOMAIN=$(get_cm_value sealos-system sealos-config cloudDomain)
  SEALOS_CLOUD_PORT=$(get_cm_value sealos-system sealos-config cloudPort)
  SEALOS_JWT_INTERNAL=$(get_cm_value sealos-system sealos-config jwtInternal)
  SEALOS_JWT_REGIONAL=$(get_cm_value sealos-system sealos-config jwtRegional)
  SEALOS_JWT_GLOBAL=$(get_cm_value sealos-system sealos-config jwtGlobal)
  SEALOS_REGION_UID=$(get_cm_value sealos-system sealos-config regionUID)
  SEALOS_DATABASE_TYPE=$(get_cm_value sealos-system sealos-config databaseType)
  SEALOS_DATABASE_GLOBAL_COCKROACHDB_URI=$(get_cm_value sealos-system sealos-config databaseGlobalCockroachdbURI)
  SEALOS_DATABASE_LOCAL_COCKROACHDB_URI=$(get_cm_value sealos-system sealos-config databaseLocalCockroachdbURI)
  SEALOS_PASSWORD_SALT=$(get_cm_value sealos-system sealos-config passwordSalt)

  if [ -n "${SEALOS_CLOUD_DOMAIN}" ]; then
    add_set_string desktopConfig.cloudDomain "${SEALOS_CLOUD_DOMAIN}"
    AUTO_CONFIG_HELM_ARGS+=(
      --set-string "ingress.hosts[0].host=${SEALOS_CLOUD_DOMAIN}"
      --set-string 'ingress.hosts[0].paths[0].path=/'
      --set-string 'ingress.hosts[0].paths[0].pathType=Prefix'
      --set-string "ingress.tls[0].hosts[0]=${SEALOS_CLOUD_DOMAIN}"
      --set-string 'ingress.tls[0].secretName=wildcard-cert'
    )
  fi

  add_set_string desktopConfig.cloudPort "${SEALOS_CLOUD_PORT}"
  add_set_string desktopConfig.jwtInternal "${SEALOS_JWT_INTERNAL}"
  add_set_string desktopConfig.jwtRegional "${SEALOS_JWT_REGIONAL}"
  add_set_string desktopConfig.jwtGlobal "${SEALOS_JWT_GLOBAL}"
  add_set_string desktopConfig.regionUID "${SEALOS_REGION_UID}"
  add_set_string desktopConfig.databaseGlobalCockroachdbURI "${SEALOS_DATABASE_GLOBAL_COCKROACHDB_URI}"
  add_set_string desktopConfig.databaseLocalCockroachdbURI "${SEALOS_DATABASE_LOCAL_COCKROACHDB_URI}"
  add_set_string desktopConfig.databaseType "${SEALOS_DATABASE_TYPE}"
  add_set_string desktopConfig.passwordSalt "${SEALOS_PASSWORD_SALT}"
fi

if ! helm status "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  echo "Fresh install detected, checking existing resources for adoption..."

  adopt_namespaced_resource serviceaccount desktop-frontend
  adopt_namespaced_resource configmap sealos-desktop-config
  adopt_namespaced_resource service sealos-desktop
  adopt_namespaced_resource deployment sealos-desktop
  adopt_namespaced_resource ingress sealos-desktop

  adopt_cluster_resource clusterrole sealos-desktop-manager-role
  adopt_cluster_resource clusterrole sealos-desktop-account-editor-role
  adopt_cluster_resource clusterrole sealos-desktop-app-reader-role
  adopt_cluster_resource clusterrolebinding sealos-desktop-user-role-binding
  adopt_cluster_resource clusterrolebinding sealos-desktop-account-editor-role-binding
  adopt_cluster_resource clusterrolebinding sealos-desktop-app-reader-role-binding

  adopt_namespaced_resource role sealos-desktop-recharge-gift-cm-reader
  adopt_namespaced_resource rolebinding sealos-desktop-recharge-gift-cm-reader-rolebinding
fi

if [ ! -f "${USER_VALUES_PATH}" ]; then
  mkdir -p "$(dirname "${USER_VALUES_PATH}")"
  cp "./charts/${SERVICE_NAME}/${SERVICE_NAME}-values.yaml" "${USER_VALUES_PATH}"
fi

VALUES_ARGS=(
  -f "./charts/${SERVICE_NAME}/values.yaml"
  -f "${USER_VALUES_PATH}"
)

echo "Deploying Helm chart..."
helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" \
  "${VALUES_ARGS[@]}" \
  "${AUTO_CONFIG_HELM_ARGS[@]}" \
  "${HELM_EXTRA_ARGS[@]}" \
  "${ENFORCED_CONFIG_HELM_ARGS[@]}"
