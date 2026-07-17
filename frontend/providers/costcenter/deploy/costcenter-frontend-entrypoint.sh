#!/bin/bash
set -euo pipefail

# Default values
RELEASE_NAME=${RELEASE_NAME:-"costcenter-frontend"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"costcenter-frontend"}
CHART_PATH=${CHART_PATH:-"./charts/costcenter-frontend"}

# Get ConfigMap value
get_cm_value() {
  local namespace="$1"
  local name="$2"
  local key="$3"
  kubectl get configmap "${name}" -n "${namespace}" -o "jsonpath={.data.${key}}" 2>/dev/null || true
}

add_set_string() {
  local key="$1"
  local value="$2"
  if [ -n "${value}" ]; then
    AUTO_CONFIG_HELM_OPTS+=(--set-string "${key}=${value}")
  fi
}

AUTO_CONFIG_HELM_OPTS=()
HELM_EXTRA_ARGS=()
if [ -n "${HELM_OPTIONS:-}" ]; then
  read -r -a PARSED_HELM_OPTIONS <<< "${HELM_OPTIONS}"
  HELM_EXTRA_ARGS+=("${PARSED_HELM_OPTIONS[@]}")
fi
if [ -n "${HELM_OPTS:-}" ]; then
  read -r -a PARSED_HELM_OPTS <<< "${HELM_OPTS}"
  HELM_EXTRA_ARGS+=("${PARSED_HELM_OPTS[@]}")
fi

add_set_string costcenterConfig.cloudDomain "$(get_cm_value sealos-system sealos-config cloudDomain)"
add_set_string costcenterConfig.cloudPort "$(get_cm_value sealos-system sealos-config cloudPort)"
add_set_string costcenterConfig.httpPort "$(get_cm_value sealos-system sealos-config httpPort)"
add_set_string costcenterConfig.disableHttps "$(get_cm_value sealos-system sealos-config disableHttps)"
add_set_string costcenterConfig.certSecretName "$(get_cm_value sealos-system sealos-config certSecretName)"
add_set_string costcenterConfig.jwtInternal "$(get_cm_value sealos-system sealos-config jwtInternal)"

# Check if Deployment selector exactly matches the immutable Helm selector.
check_deployment_selector() {
  local deployment_name="$1"
  local current_selector
  current_selector=$(kubectl -n "${RELEASE_NAMESPACE}" get deployment "${deployment_name}" \
    -o go-template='{{len .spec.selector.matchLabels}}|{{index .spec.selector.matchLabels "app.kubernetes.io/name"}}|{{index .spec.selector.matchLabels "app.kubernetes.io/instance"}}')
  [ "${current_selector}" = "2|costcenter-frontend|${RELEASE_NAME}" ]
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
    if [ -n "${current_uid}" ] && [ "${current_uid}" = "${DEPLOYMENT_BACKUP_UID}" ]; then
      echo "Deployment replacement failed before the original costcenter-frontend Deployment was removed; leaving it unchanged." >&2
    else
      echo "Deployment replacement failed; restoring costcenter-frontend from ${DEPLOYMENT_BACKUP_FILE}..." >&2
      kubectl -n "${RELEASE_NAMESPACE}" delete deployment costcenter-frontend --ignore-not-found=true >/dev/null || true
      if ! kubectl apply -f "${DEPLOYMENT_BACKUP_FILE}"; then
        echo "Failed to restore Deployment costcenter-frontend; backup preserved at ${DEPLOYMENT_BACKUP_FILE}" >&2
        keep_backup=true
      fi
    fi
  fi

  if [ -n "${DEPLOYMENT_BACKUP_FILE}" ] && [ "${keep_backup}" != true ]; then
    rm -f "${DEPLOYMENT_BACKUP_FILE}"
  fi
}

trap restore_deployment_on_failure EXIT

# Backup and remove a Deployment only when its immutable selector is incompatible.
recreate_deployment_if_needed() {
  local deployment_name="$1"
  local backup_file
  local original_uid

  if ! kubectl -n "${RELEASE_NAMESPACE}" get deployment "${deployment_name}" >/dev/null 2>&1; then
    return 0
  fi

  if check_deployment_selector "${deployment_name}"; then
    echo "Deployment ${deployment_name} selector is compatible, skipping recreation..."
    return 0
  fi

  assert_namespaced_resource_adoptable "${RELEASE_NAMESPACE}" deployment "${deployment_name}"
  backup_file="/tmp/${deployment_name}-backup-$(date +%s)-$$.yaml"
  original_uid=$(kubectl -n "${RELEASE_NAMESPACE}" get deployment "${deployment_name}" -o jsonpath='{.metadata.uid}')

  echo "Deployment ${deployment_name} selector is incompatible; backing it up before replacement..."
  if ! kubectl -n "${RELEASE_NAMESPACE}" get deployment "${deployment_name}" \
    -o yaml --show-managed-fields=false | sed \
      -e '/^status:/,$d' \
      -e '/^  creationTimestamp:/d' \
      -e '/^  generation:/d' \
      -e '/^  resourceVersion:/d' \
      -e '/^  uid:/d' > "${backup_file}"; then
    rm -f "${backup_file}"
    return 1
  fi
  if [ ! -s "${backup_file}" ]; then
    echo "Deployment backup ${backup_file} is empty; refusing replacement." >&2
    rm -f "${backup_file}"
    return 1
  fi

  DEPLOYMENT_BACKUP_FILE="${backup_file}"
  DEPLOYMENT_BACKUP_UID="${original_uid}"

  kubectl -n "${RELEASE_NAMESPACE}" delete deployment "${deployment_name}" --ignore-not-found=true
}

assert_namespaced_resource_adoptable() {
  local namespace="$1"
  local kind="$2"
  local name="$3"
  local ownership managed_by owner_release owner_namespace
  ownership=$(kubectl -n "${namespace}" get "${kind}" "${name}" \
    -o jsonpath='{.metadata.labels.app\.kubernetes\.io/managed-by}{"|"}{.metadata.annotations.meta\.helm\.sh/release-name}{"|"}{.metadata.annotations.meta\.helm\.sh/release-namespace}')
  IFS='|' read -r managed_by owner_release owner_namespace <<< "${ownership}"
  if { [ "${managed_by}" = "Helm" ] || [ -n "${owner_release}" ] || [ -n "${owner_namespace}" ]; } && \
    { [ "${owner_release}" != "${RELEASE_NAME}" ] || [ "${owner_namespace}" != "${RELEASE_NAMESPACE}" ]; }; then
    echo "Refusing to adopt ${kind} ${namespace}/${name}: owned by Helm release ${owner_namespace}/${owner_release}" >&2
    return 1
  fi
}

adopt_namespaced_resource() {
  local namespace="$1"
  local kind="$2"
  local name="$3"
  if ! kubectl -n "${namespace}" get "${kind}" "${name}" >/dev/null 2>&1; then
    return 0
  fi

  assert_namespaced_resource_adoptable "${namespace}" "${kind}" "${name}"

  local managed_by
  managed_by=$(kubectl -n "${namespace}" get "${kind}" "${name}" -o jsonpath='{.metadata.labels.app\.kubernetes\.io/managed-by}')
  if [ "${managed_by}" = "Helm" ]; then
    return 0
  fi

  echo "Adopting ${kind} ${namespace}/${name}..."
  kubectl -n "${namespace}" label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null
  kubectl -n "${namespace}" annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null
}

# Pre-check and adopt existing resources before Helm upgrade (both fresh and upgrade)
echo "Checking and adopting existing resources..."
if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" configmap costcenter-frontend-config
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" service costcenter-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" ingress costcenter-frontend
fi

adopt_namespaced_resource app-system apps.app.sealos.io costcenter

# Handle Deployment selector compatibility before Helm upgrade (both fresh and upgrade)
echo "Checking Deployment selector compatibility..."
recreate_deployment_if_needed "costcenter-frontend"

# Adopt deployment after potential recreation (if it exists)
if kubectl -n "${RELEASE_NAMESPACE}" get deployment costcenter-frontend >/dev/null 2>&1; then
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" deployment costcenter-frontend
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
  "${AUTO_CONFIG_HELM_OPTS[@]}" \
  "${HELM_EXTRA_ARGS[@]}"

DEPLOYMENT_REPLACEMENT_COMPLETE=true

if [ -n "${DEPLOYMENT_BACKUP_FILE}" ]; then
  rm -f "${DEPLOYMENT_BACKUP_FILE}"
  DEPLOYMENT_BACKUP_FILE=""
fi
