#!/bin/bash
set -euo pipefail
umask 077

# Default values
RELEASE_NAME=${RELEASE_NAME:-"costcenter-frontend"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"costcenter-frontend"}
CHART_PATH=${CHART_PATH:-"./charts/costcenter-frontend"}

# HELM_OPTS support
HELM_OPTS=${HELM_OPTS:-""}
HELM_OPTIONS=${HELM_OPTIONS:-""}

# Get ConfigMap value
get_cm_value() {
  local namespace="$1"
  local name="$2"
  local key="$3"
  kubectl get configmap "${name}" -n "${namespace}" -o "jsonpath={.data.${key}}" 2>/dev/null || true
}

DEPLOYMENT_BACKUP_FILE=""
DEPLOYMENT_BACKUP_UID=""
DEPLOYMENT_REPLACEMENT_COMPLETE=false

restore_deployment_on_failure() {
  local exit_code=$?
  local current_uid=""
  local keep_backup=false
  if [ "${exit_code}" -ne 0 ] && [ -n "${DEPLOYMENT_BACKUP_FILE}" ] && [ "${DEPLOYMENT_REPLACEMENT_COMPLETE}" != true ]; then
    current_uid=$(kubectl -n "${RELEASE_NAMESPACE}" get deployment costcenter-frontend \
      -o jsonpath='{.metadata.uid}' 2>/dev/null || true)
    if [ "${current_uid}" = "${DEPLOYMENT_BACKUP_UID}" ]; then
      echo "Deployment replacement failed before the original Deployment was removed; leaving it unchanged." >&2
    else
      echo "Deployment replacement failed; restoring from ${DEPLOYMENT_BACKUP_FILE}..." >&2
      kubectl -n "${RELEASE_NAMESPACE}" delete deployment costcenter-frontend --ignore-not-found=true >/dev/null 2>&1 || true
      if ! kubectl apply -f "${DEPLOYMENT_BACKUP_FILE}"; then
        echo "Failed to restore Deployment; backup preserved at ${DEPLOYMENT_BACKUP_FILE}" >&2
        keep_backup=true
      fi
    fi
  fi
  if [ -n "${DEPLOYMENT_BACKUP_FILE}" ] && [ "${keep_backup}" != true ]; then
    rm -f "${DEPLOYMENT_BACKUP_FILE}"
  fi
}
trap restore_deployment_on_failure EXIT

# Read cluster configuration through the ConfigMap interface used by main.
AUTO_CONFIG_HELM_OPTS=()
ENFORCED_CONFIG_HELM_OPTS=()
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

add_set_string costcenterConfig.cloudDomain "$(get_cm_value sealos-system sealos-config cloudDomain)"
add_set_string costcenterConfig.cloudPort "$(get_cm_value sealos-system sealos-config cloudPort)"
add_set_string costcenterConfig.httpPort "$(get_cm_value sealos-system sealos-config httpPort)"
add_set_string costcenterConfig.disableHttps "$(get_cm_value sealos-system sealos-config disableHttps)"
add_set_string costcenterConfig.regionUID "$(get_cm_value sealos-system sealos-config regionUID)"
add_set_string costcenterConfig.certSecretName "$(get_cm_value sealos-system sealos-config certSecretName)"
add_set_string costcenterConfig.jwtInternal "$(get_cm_value sealos-system sealos-config jwtInternal)"
TLS_REJECT_UNAUTHORIZED="$(get_cm_value sealos-system sealos-config tlsRejectUnauthorized)"
add_enforced_set_string costcenterConfig.tlsRejectUnauthorized "${TLS_REJECT_UNAUTHORIZED:-1}"

# Check if Deployment selector matches expected Helm labels
check_deployment_selector() {
  local deployment_name="$1"
  local current_selector
  current_selector=$(kubectl -n "${RELEASE_NAMESPACE}" get deployment "${deployment_name}" \
    -o go-template='{{len .spec.selector.matchLabels}}|{{index .spec.selector.matchLabels "app.kubernetes.io/name"}}|{{index .spec.selector.matchLabels "app.kubernetes.io/instance"}}' 2>/dev/null || true)
  [ "${current_selector}" = "2|costcenter-frontend|${RELEASE_NAME}" ]
}

# Backup and recreate Deployment if selector incompatible
recreate_deployment_if_needed() {
  local deployment_name="$1"

  if ! kubectl -n "${RELEASE_NAMESPACE}" get deployment "${deployment_name}" >/dev/null 2>&1; then
    return 0  # Deployment doesn't exist, nothing to do
  fi

  if check_deployment_selector "${deployment_name}"; then
    echo "Deployment ${deployment_name} selector is compatible, skipping recreation..."
    return 0
  fi

  echo "Deployment ${deployment_name} selector incompatible, recreating..."
  local backup_file
  backup_file="/tmp/${deployment_name}-backup-$(date +%s)-$$.yaml"
  local original_uid
  original_uid=$(kubectl -n "${RELEASE_NAMESPACE}" get deployment "${deployment_name}" -o jsonpath='{.metadata.uid}')
  if ! kubectl -n "${RELEASE_NAMESPACE}" get deployment "${deployment_name}" -o yaml --show-managed-fields=false | sed \
    -e '/^status:/,$d' \
    -e '/^  creationTimestamp:/d' \
    -e '/^  generation:/d' \
    -e '/^  resourceVersion:/d' \
    -e '/^  uid:/d' > "${backup_file}" || [ ! -s "${backup_file}" ]; then
    rm -f "${backup_file}"
    echo "Could not create a valid Deployment backup; refusing replacement." >&2
    return 1
  fi
  DEPLOYMENT_BACKUP_FILE="${backup_file}"
  DEPLOYMENT_BACKUP_UID="${original_uid}"

  # Delete deployment (Helm will recreate it)
  kubectl -n "${RELEASE_NAMESPACE}" delete deployment "${deployment_name}"

  echo "Deployment ${deployment_name} recreated (backup saved to ${backup_file})"
}

# Adopt existing resources for Helm
adopt_namespaced_resource() {
  local namespace="$1"
  local kind="$2"
  local name="$3"
  local ownership managed_by owner_release owner_namespace
  if kubectl -n "${namespace}" get "${kind}" "${name}" >/dev/null 2>&1; then
    ownership=$(kubectl -n "${namespace}" get "${kind}" "${name}" \
      -o jsonpath='{.metadata.labels.app\.kubernetes\.io/managed-by}{"|"}{.metadata.annotations.meta\.helm\.sh/release-name}{"|"}{.metadata.annotations.meta\.helm\.sh/release-namespace}')
    IFS='|' read -r managed_by owner_release owner_namespace <<< "${ownership}"
    if { [ "${managed_by}" = "Helm" ] || [ -n "${owner_release}" ] || [ -n "${owner_namespace}" ]; } && \
      { [ "${owner_release}" != "${RELEASE_NAME}" ] || [ "${owner_namespace}" != "${RELEASE_NAMESPACE}" ]; }; then
      echo "Refusing to adopt ${kind} ${namespace}/${name}: owned by Helm release ${owner_namespace}/${owner_release}" >&2
      return 1
    fi

    echo "Adopting ${kind} ${name}..."
    kubectl -n "${namespace}" label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null
    kubectl -n "${namespace}" annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null
  fi
}

# Pre-check and adopt existing resources before Helm upgrade (both fresh and upgrade)
echo "Checking and adopting existing resources..."
if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  # Adopt namespaced resources
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" configmap costcenter-frontend-config
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" service costcenter-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" ingress costcenter-frontend
fi
adopt_namespaced_resource app-system apps.app.sealos.io costcenter

# Verify ownership before a possible selector-driven replacement.
if kubectl -n "${RELEASE_NAMESPACE}" get deployment costcenter-frontend >/dev/null 2>&1; then
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" deployment costcenter-frontend
fi

# Handle immutable Deployment selector changes before Helm upgrade.
echo "Checking Deployment selector compatibility..."
recreate_deployment_if_needed "costcenter-frontend"

# Prepare values files
SERVICE_NAME="costcenter-frontend"
USER_VALUES_PATH="/root/.sealos/cloud/values/core/${SERVICE_NAME}-values.yaml"
GLOBALS_VALUES_PATH="/root/.sealos/cloud/values/global.yaml"

# Copy user values template if not exists
if [ ! -f "${USER_VALUES_PATH}" ]; then
  mkdir -p "$(dirname "${USER_VALUES_PATH}")"
  cp "./charts/${SERVICE_NAME}/${SERVICE_NAME}-values.yaml" "${USER_VALUES_PATH}"
fi

# Deploy Helm chart
echo "Deploying Helm chart..."
HELM_EXTRA_ARGS=()
if [ -n "${HELM_OPTIONS}" ]; then
  read -r -a HELM_EXTRA_ARGS <<< "${HELM_OPTIONS}"
fi
if [ -n "${HELM_OPTS}" ]; then
  read -r -a HELM_OPTS_ARGS <<< "${HELM_OPTS}"
  HELM_EXTRA_ARGS+=("${HELM_OPTS_ARGS[@]}")
fi

GLOBAL_VALUES_ARGS=()
if [ -f "${GLOBALS_VALUES_PATH}" ]; then
  GLOBAL_VALUES_ARGS=(-f "${GLOBALS_VALUES_PATH}")
fi

helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" \
  -f "./charts/${SERVICE_NAME}/values.yaml" \
  -f "${USER_VALUES_PATH}" \
  "${GLOBAL_VALUES_ARGS[@]}" \
  "${AUTO_CONFIG_HELM_OPTS[@]}" \
  "${HELM_EXTRA_ARGS[@]}" \
  "${ENFORCED_CONFIG_HELM_OPTS[@]}"

DEPLOYMENT_REPLACEMENT_COMPLETE=true
if [ -n "${DEPLOYMENT_BACKUP_FILE}" ]; then
  rm -f "${DEPLOYMENT_BACKUP_FILE}"
  DEPLOYMENT_BACKUP_FILE=""
fi
