#!/bin/bash
set -e

# Default values
RELEASE_NAME=${RELEASE_NAME:-"costcenter-frontend"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"costcenter-frontend"}
CHART_PATH=${CHART_PATH:-"./charts/costcenter-frontend"}

# HELM_OPTS support
HELM_OPTS=${HELM_OPTS:-""}

# Get ConfigMap value
get_cm_value() {
  local namespace="$1"
  local name="$2"
  local key="$3"
  kubectl get configmap "${name}" -n "${namespace}" -o "jsonpath={.data.${key}}" 2>/dev/null || true
}

# Auto configuration from sealos-system ConfigMap
AUTO_CONFIG_HELM_OPTS=""

JWT_INTERNAL=$(get_cm_value sealos-system sealos-config jwtInternal)

[ -n "$JWT_INTERNAL" ] && AUTO_CONFIG_HELM_OPTS="$AUTO_CONFIG_HELM_OPTS --set-string costcenterConfig.jwtInternal=$JWT_INTERNAL"

# Check if Deployment selector matches expected Helm labels
check_deployment_selector() {
  local deployment_name="$1"
  local expected_selector="$2"

  local current_selector
  current_selector=$(kubectl -n "${RELEASE_NAMESPACE}" get deployment "${deployment_name}" -o jsonpath='{.spec.selector.matchLabels}' 2>/dev/null || echo "{}")

  # Simple check: if expected selector contains key-value pairs that differ
  if echo "$current_selector" | grep -q "app.kubernetes.io/name"; then
    return 0  # Selector already has Helm labels, assume compatible
  fi

  return 1  # Selector incompatible
}

# Backup and recreate Deployment if selector incompatible
recreate_deployment_if_needed() {
  local deployment_name="$1"
  local expected_selector="$2"

  if ! kubectl -n "${RELEASE_NAMESPACE}" get deployment "${deployment_name}" >/dev/null 2>&1; then
    return 0  # Deployment doesn't exist, nothing to do
  fi

  if check_deployment_selector "${deployment_name}" "${expected_selector}"; then
    echo "Deployment ${deployment_name} selector is compatible, skipping recreation..."
    return 0
  fi

  echo "Deployment ${deployment_name} selector incompatible, recreating..."
  local backup_file="/tmp/${deployment_name}-backup-$(date +%s).yaml"

  # Backup current deployment
  kubectl -n "${RELEASE_NAMESPACE}" get deployment "${deployment_name}" -o yaml > "${backup_file}"

  # Delete deployment (Helm will recreate it)
  kubectl -n "${RELEASE_NAMESPACE}" delete deployment "${deployment_name}" --ignore-not-found=true

  echo "Deployment ${deployment_name} recreated (backup saved to ${backup_file})"
}

# Adopt existing resources for Helm
adopt_namespaced_resource() {
  local kind="$1"
  local name="$2"
  if kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" >/dev/null 2>&1; then
    echo "Adopting ${kind} ${name}..."
    kubectl -n "${RELEASE_NAMESPACE}" label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl -n "${RELEASE_NAMESPACE}" annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi
}

# Pre-check and adopt existing resources before Helm upgrade (both fresh and upgrade)
echo "Checking and adopting existing resources..."
if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  # Adopt namespace
  kubectl label namespace "${RELEASE_NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
  kubectl annotate namespace "${RELEASE_NAMESPACE}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true

  # Adopt namespaced resources
  adopt_namespaced_resource configmap costcenter-frontend-config
  adopt_namespaced_resource service costcenter-frontend
fi

# Handle Deployment selector compatibility before Helm upgrade (both fresh and upgrade)
echo "Checking Deployment selector compatibility..."
recreate_deployment_if_needed "costcenter-frontend" "app.kubernetes.io/name=costcenter-frontend"

# Adopt deployment after potential recreation (if it exists)
if kubectl -n "${RELEASE_NAMESPACE}" get deployment costcenter-frontend >/dev/null 2>&1; then
  adopt_namespaced_resource deployment costcenter-frontend
fi

# Prepare values files
SERVICE_NAME="costcenter-frontend"
USER_VALUES_PATH="/root/.sealos/cloud/values/core/${SERVICE_NAME}-values.yaml"

# Copy user values template if not exists
if [ ! -f "${USER_VALUES_PATH}" ]; then
  mkdir -p "$(dirname "${USER_VALUES_PATH}")"
  cp "./charts/${SERVICE_NAME}/${SERVICE_NAME}-values.yaml" "${USER_VALUES_PATH}"
fi

# Deploy Helm chart
echo "Deploying Helm chart..."
helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" \
  -f "./charts/${SERVICE_NAME}/values.yaml" \
  -f "${USER_VALUES_PATH}" \
  ${AUTO_CONFIG_HELM_OPTS} \
  ${HELM_OPTS}
