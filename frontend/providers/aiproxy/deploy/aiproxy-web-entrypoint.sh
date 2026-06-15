#!/bin/bash
set -e

RELEASE_NAME=${RELEASE_NAME:-"aiproxy-web"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"aiproxy-system"}
CHART_PATH=${CHART_PATH:-"./charts/aiproxy"}
HELM_OPTS=${HELM_OPTS:-""}
HELM_OPTIONS=${HELM_OPTIONS:-""}
AUTO_CONFIG_HELM_OPTS=""

get_cm_value() {
  local namespace="$1"
  local name="$2"
  local key="$3"
  kubectl get configmap "${name}" -n "${namespace}" -o "jsonpath={.data.${key}}" 2>/dev/null || true
}

get_deploy_env() {
  local namespace="$1"
  local deployment="$2"
  local key="$3"
  kubectl get deployment -n "${namespace}" "${deployment}" -o "jsonpath={.spec.template.spec.containers[0].env[?(@.name==\"${key}\")].value}" 2>/dev/null || true
}

add_set_string() {
  local key="$1"
  local value="$2"
  if [ -n "${value}" ]; then
    AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string ${key}=${value}"
  fi
}

NODE_COUNT=$(kubectl get nodes --no-headers 2>/dev/null | wc -l | tr -d " ")
if [ "${NODE_COUNT}" = "1" ]; then
  AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set replicas=1"
fi

JWT_INTERNAL=${JWT_INTERNAL:-"${jwtInternal:-$(get_cm_value sealos-system sealos-config jwtInternal)}"}
ADMIN_KEY=${ADMIN_KEY:-"${adminKey:-$(get_cm_value aiproxy-system aiproxy-env ADMIN_KEY)}"}
SEALOS_CLOUD_DOMAIN=${SEALOS_CLOUD_DOMAIN:-"${cloudDomain:-$(get_cm_value sealos-system sealos-config cloudDomain)}"}
SEALOS_CLOUD_PORT=${SEALOS_CLOUD_PORT:-"${cloudPort:-$(get_cm_value sealos-system sealos-config cloudPort)}"}
CURRENCY_SYMBOL=${CURRENCY_SYMBOL:-"${currencySymbol:-$(get_deploy_env dbprovider-frontend dbprovider-frontend CURRENCY_SYMBOL)}"}
SUFFIX=${SUFFIX:-"${suffix:-}"}

if [ "${CURRENCY_SYMBOL}" = "usd" ] && [ -z "${SUFFIX}" ]; then
  SUFFIX="/en/home"
fi

add_set_string aiproxy.APP_TOKEN_JWT_KEY "${JWT_INTERNAL}"
add_set_string aiproxy.AI_PROXY_BACKEND_KEY "${ADMIN_KEY}"
add_set_string cloudDomain "${SEALOS_CLOUD_DOMAIN}"
add_set_string cloudPort "${SEALOS_CLOUD_PORT}"
add_set_string aiproxy.CURRENCY_SYMBOL "${CURRENCY_SYMBOL}"
add_set_string suffix "${SUFFIX}"

adopt_namespaced_resource() {
  local namespace="$1"
  local kind="$2"
  local name="$3"
  if kubectl -n "${namespace}" get "${kind}" "${name}" >/dev/null 2>&1; then
    echo "Adopting ${kind} ${namespace}/${name}..."
    kubectl -n "${namespace}" label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl -n "${namespace}" annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi
}

echo "Checking and adopting existing resources..."
if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  kubectl label namespace "${RELEASE_NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
  kubectl annotate namespace "${RELEASE_NAMESPACE}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true

  adopt_namespaced_resource "${RELEASE_NAMESPACE}" configmap aiproxy-web
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" service aiproxy-web
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" deployment aiproxy-web
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" ingress aiproxy-web
fi

adopt_namespaced_resource app-system apps.app.sealos.io aiproxy

SERVICE_NAME="aiproxy-web"
USER_VALUES_PATH="/root/.sealos/cloud/values/core/${SERVICE_NAME}-values.yaml"

if [ ! -f "${USER_VALUES_PATH}" ]; then
  mkdir -p "$(dirname "${USER_VALUES_PATH}")"
  cp "./charts/aiproxy/${SERVICE_NAME}-values.yaml" "${USER_VALUES_PATH}"
fi

HELM_ARGS="${AUTO_CONFIG_HELM_OPTS} ${HELM_OPTIONS} ${HELM_OPTS}"

echo "Deploying Helm chart..."
helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" \
  -f "./charts/aiproxy/values.yaml" \
  -f "${USER_VALUES_PATH}" \
  ${HELM_ARGS}
