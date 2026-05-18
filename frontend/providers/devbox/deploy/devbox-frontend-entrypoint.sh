#!/bin/bash
set -e

# Default values
RELEASE_NAME=${RELEASE_NAME:-"devbox-frontend"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"devbox-frontend"}
CHART_PATH=${CHART_PATH:-"./charts/devbox-frontend"}
AUTO_CONFIG_ENABLED=${AUTO_CONFIG_ENABLED:-"true"}

# HELM_OPTS and HELM_OPTIONS support
HELM_OPTS=${HELM_OPTS:-""}
HELM_OPTIONS=${HELM_OPTIONS:-""}

HELM_ARGS=""
[ -n "${HELM_OPTIONS}" ] && HELM_ARGS="${HELM_ARGS} ${HELM_OPTIONS}"
[ -n "${HELM_OPTS}" ] && HELM_ARGS="${HELM_ARGS} ${HELM_OPTS}"

get_cm_value() {
  local namespace="$1"
  local name="$2"
  local key="$3"
  kubectl get configmap "${name}" -n "${namespace}" -o "jsonpath={.data.${key}}" 2>/dev/null || true
}

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

check_deployment_selector() {
  local deployment_name="$1"
  local current_selector

  current_selector=$(kubectl -n "${RELEASE_NAMESPACE}" get deployment "${deployment_name}" -o jsonpath='{.spec.selector.matchLabels}' 2>/dev/null || echo "{}")
  if echo "${current_selector}" | grep -q "app.kubernetes.io/name"; then
    return 0
  fi

  return 1
}

recreate_deployment_if_needed() {
  local deployment_name="$1"

  if ! kubectl -n "${RELEASE_NAMESPACE}" get deployment "${deployment_name}" >/dev/null 2>&1; then
    return 0
  fi

  if check_deployment_selector "${deployment_name}"; then
    echo "Deployment ${deployment_name} selector is compatible, skipping recreation..."
    return 0
  fi

  echo "Deployment ${deployment_name} selector incompatible, recreating..."
  local backup_file="/tmp/${deployment_name}-backup-$(date +%s).yaml"
  kubectl -n "${RELEASE_NAMESPACE}" get deployment "${deployment_name}" -o yaml > "${backup_file}"
  kubectl -n "${RELEASE_NAMESPACE}" delete deployment "${deployment_name}" --ignore-not-found=true
  echo "Deployment ${deployment_name} recreated (backup saved to ${backup_file})"
}

if [ "${AUTO_CONFIG_ENABLED}" = "true" ]; then
  echo "Auto-configuring from sealos-system/sealos-config..."

  CLOUD_DOMAIN=${CLOUD_DOMAIN:-"$(get_cm_value sealos-system sealos-config cloudDomain)"}
  CLOUD_PORT=${CLOUD_PORT:-"$(get_cm_value sealos-system sealos-config cloudPort)"}
  CERT_SECRET_NAME=${CERT_SECRET_NAME:-"wildcard-cert"}
  REGISTRY_ADDR=${REGISTRY_ADDR:-"sealos.hub:5000"}
  JWT_INTERNAL=${JWT_INTERNAL:-"$(get_cm_value sealos-system sealos-config jwtInternal)"}
  REGION_UID=${REGION_UID:-"$(get_cm_value sealos-system sealos-config regionUID)"}
  DATABASE_URL=${DATABASE_URL:-"$(get_cm_value sealos-system sealos-config databaseGlobalCockroachdbURI)"}
  DATABASE_URL=${DATABASE_URL//global/devboxdb}

  [ -n "${CLOUD_DOMAIN}" ] && HELM_ARGS="${HELM_ARGS} --set-string devboxConfig.cloudDomain=${CLOUD_DOMAIN} --set-string ingress.host=devbox.${CLOUD_DOMAIN}"
  [ -n "${CLOUD_PORT}" ] && HELM_ARGS="${HELM_ARGS} --set-string devboxConfig.cloudPort=${CLOUD_PORT}"
  [ -n "${CERT_SECRET_NAME}" ] && HELM_ARGS="${HELM_ARGS} --set-string devboxConfig.certSecretName=${CERT_SECRET_NAME} --set-string ingress.certSecretName=${CERT_SECRET_NAME}"
  [ -n "${REGISTRY_ADDR}" ] && HELM_ARGS="${HELM_ARGS} --set-string devboxConfig.registryAddr=${REGISTRY_ADDR}"
  [ -n "${JWT_INTERNAL}" ] && HELM_ARGS="${HELM_ARGS} --set-string devboxConfig.jwtInternal=${JWT_INTERNAL}"
  [ -n "${REGION_UID}" ] && HELM_ARGS="${HELM_ARGS} --set-string devboxConfig.regionUID=${REGION_UID}"
  [ -n "${DATABASE_URL}" ] && HELM_ARGS="${HELM_ARGS} --set-string devboxConfig.databaseURL=${DATABASE_URL}"
fi

echo "Checking and adopting existing resources..."
if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  kubectl label namespace "${RELEASE_NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
  kubectl annotate namespace "${RELEASE_NAMESPACE}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true

  adopt_namespaced_resource "${RELEASE_NAMESPACE}" configmap devbox-frontend-config
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" service devbox-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" ingress devbox-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" ingress devbox-challenge
fi

echo "Checking Deployment selector compatibility..."
recreate_deployment_if_needed "devbox-frontend"

if kubectl -n "${RELEASE_NAMESPACE}" get deployment devbox-frontend >/dev/null 2>&1; then
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" deployment devbox-frontend
fi

if kubectl get namespace app-system >/dev/null 2>&1; then
  adopt_namespaced_resource app-system app devbox
fi

SERVICE_NAME="devbox-frontend"
USER_VALUES_PATH="/root/.sealos/cloud/values/apps/${SERVICE_NAME}-values.yaml"

if [ ! -f "${USER_VALUES_PATH}" ]; then
  mkdir -p "$(dirname "${USER_VALUES_PATH}")"
  cp "./charts/${SERVICE_NAME}/${SERVICE_NAME}-values.yaml" "${USER_VALUES_PATH}"
fi

GLOBALS_FILE="/root/.sealos/cloud/values/global.yaml"
if [ -f "${GLOBALS_FILE}" ]; then
  echo "Merging global values from ${GLOBALS_FILE} into user values..."
  HELM_ARGS="$HELM_ARGS -f ${GLOBALS_FILE}"
fi

echo "Deploying Helm chart..."
helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" \
  -f "./charts/${SERVICE_NAME}/values.yaml" \
  -f "${USER_VALUES_PATH}" \
  ${HELM_ARGS}
