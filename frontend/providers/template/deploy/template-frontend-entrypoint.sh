#!/bin/bash
set -euo pipefail

RELEASE_NAME=${RELEASE_NAME:-"template-frontend"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"template-frontend"}
CHART_PATH=${CHART_PATH:-"./charts/template-frontend"}
TOOLS_FILE=${TOOLS_FILE:-"/root/.sealos/cloud/scripts/tools.sh"}
AUTO_CONFIG_HELM_OPTS=()
ENFORCED_CONFIG_HELM_OPTS=()
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
    AUTO_CONFIG_HELM_OPTS+=(--set-string "${key}=${value}")
  fi
}

add_enforced_set_string() {
  local key="$1"
  local value="$2"
  if [ -n "${value}" ]; then
    ENFORCED_CONFIG_HELM_OPTS+=(--set-string "${key}=${value}")
  fi
}

read_template_repo_auto_inject() {
  local configured="${TEMPLATE_REPO_AUTO_INJECT:-${templateRepoAutoInject:-}}"
  if [ -z "${configured}" ] && [ -f "${USER_VALUES_PATH}" ]; then
    configured="$(
      sed -n '/^[[:space:]]*templateConfig:[[:space:]]*$/,/^[^[:space:]][^:]*:/s/^[[:space:]]*templateRepoAutoInject:[[:space:]]*//p' "${USER_VALUES_PATH}" |
        head -n 1
    )"
  fi
  configured="$(printf '%s' "${configured:-true}" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]"' | tr -d "'")"
  [ "${configured}" != "false" ]
}

USER_VALUES_PATH="/root/.sealos/cloud/values/apps/template/template-values.yaml"
load_cloud_tools_or_exit
tls_reject_unauthorized="$(read_cert_tls_reject_unauthorized)"
if [ "${tls_reject_unauthorized}" = "1" ]; then
  git_ssl_no_verify="false"
else
  git_ssl_no_verify="true"
fi
add_enforced_set_string templateConfig.tlsRejectUnauthorized "${tls_reject_unauthorized}"

CONFIG_CLOUD_DOMAIN=$(get_cm_value sealos-system sealos-config cloudDomain)
CONFIG_CLOUD_PORT=$(get_cm_value sealos-system sealos-config cloudPort)
CONFIG_CERT_SECRET_NAME=$(get_cm_value sealos-system sealos-config certSecretName)

SEALOS_CLOUD_DOMAIN=${CONFIG_CLOUD_DOMAIN:-${SEALOS_CLOUD_DOMAIN:-${cloudDomain:-}}}
SEALOS_CLOUD_PORT=${CONFIG_CLOUD_PORT:-${SEALOS_CLOUD_PORT:-${cloudPort:-}}}
SEALOS_CERT_SECRET_NAME=${CONFIG_CERT_SECRET_NAME:-${SEALOS_CERT_SECRET_NAME:-${certSecretName:-}}}
#https and acme using default template url. else use gogs.<domain>
SEALOS_CERT_MODE=$(get_cm_value sealos-system cert-config CERT_MODE)
SEALOS_CERT_MODE="$(printf '%s' "${CERT_MODE:-${SEALOS_CERT_MODE:-self-signed}}" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"


add_set_string templateConfig.cloudDomain "${SEALOS_CLOUD_DOMAIN}"
add_set_string templateConfig.cloudPort "${SEALOS_CLOUD_PORT}"
add_set_string templateConfig.certSecretName "${SEALOS_CERT_SECRET_NAME}"

if read_template_repo_auto_inject; then
  add_set_string templateConfig.templateRepoAutoInject "true"
  add_set_string templateConfig.templateRepoEnableReadmeFetch "true"
  add_enforced_set_string templateConfig.templateRepoGitSslNoVerify "${git_ssl_no_verify}"
  if [ "${SEALOS_CERT_MODE}" = "https" ] || [ "${SEALOS_CERT_MODE}" = "acme" ] || [ "${SEALOS_CERT_MODE}" = "acmedns" ]; then
    add_set_string templateConfig.templateRepoUrl "https://github.com/labring-actions/templates"
    add_set_string templateConfig.templateRepoProvider "github"
  else
    add_set_string templateConfig.templateRepoUrl "https://gogs.${SEALOS_CLOUD_DOMAIN}/sealos-admin/templates"
    add_set_string templateConfig.templateRepoProvider "gogs"
  fi
fi

adopt_namespaced_resource() {
  local namespace="$1"
  local kind="$2"
  local name="$3"
  if kubectl -n "${namespace}" get "${kind}" "${name}" >/dev/null 2>&1; then
    local ownership managed_by owner_release owner_namespace
    ownership=$(kubectl -n "${namespace}" get "${kind}" "${name}" \
      -o jsonpath='{.metadata.labels.app\.kubernetes\.io/managed-by}{"|"}{.metadata.annotations.meta\.helm\.sh/release-name}{"|"}{.metadata.annotations.meta\.helm\.sh/release-namespace}')
    IFS='|' read -r managed_by owner_release owner_namespace <<< "${ownership}"
    if { [ "${managed_by}" = "Helm" ] || [ -n "${owner_release}" ] || [ -n "${owner_namespace}" ]; } && \
      { [ "${owner_release}" != "${RELEASE_NAME}" ] || [ "${owner_namespace}" != "${RELEASE_NAMESPACE}" ]; }; then
      echo "Refusing to adopt ${kind} ${namespace}/${name}: owned by Helm release ${owner_namespace}/${owner_release}" >&2
      return 1
    fi
    if [ "${managed_by}" = "Helm" ]; then
      return 0
    fi
    echo "Adopting ${kind} ${namespace}/${name}..."
    kubectl -n "${namespace}" label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null
    kubectl -n "${namespace}" annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null
  fi
}

adopt_cluster_resource() {
  local kind="$1"
  local name="$2"
  if kubectl get "${kind}" "${name}" >/dev/null 2>&1; then
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
    kubectl annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null
  fi
}

echo "Checking and adopting existing resources..."
if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" configmap template-frontend-config
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" service template-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" deployment template-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" ingress template-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" cronjob template-static
fi

adopt_namespaced_resource app-system apps.app.sealos.io template
adopt_cluster_resource clusterrole template-frontend-static-role
adopt_cluster_resource clusterrolebinding template-frontend-static-role-binding

SERVICE_NAME="template-frontend"
if [ ! -f "${USER_VALUES_PATH}" ]; then
  mkdir -p "$(dirname "${USER_VALUES_PATH}")"
  cp "./charts/${SERVICE_NAME}/${SERVICE_NAME}-values.yaml" "${USER_VALUES_PATH}"
fi

echo "Deploying Helm chart..."
helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" \
  -f "./charts/${SERVICE_NAME}/values.yaml" \
  -f "${USER_VALUES_PATH}" \
  "${AUTO_CONFIG_HELM_OPTS[@]}" \
  "${HELM_EXTRA_ARGS[@]}" \
  "${ENFORCED_CONFIG_HELM_OPTS[@]}"
