#!/bin/bash
set -ex

# Version selection: v1alpha1 or v2alpha2 (default: v2alpha2)
DEVBOX_VERSION=${DEVBOX_VERSION:-"v2alpha2"}

HELM_OPTS=${HELM_OPTS:-""}
RELEASE_NAME=${RELEASE_NAME:-"devbox"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"devbox-system"}

# Select chart path based on version
if [ "${DEVBOX_VERSION}" = "v1alpha1" ]; then
  CHART_PATH=${CHART_PATH:-"./charts/devbox-controller-v1alpha1"}
else
  CHART_PATH=${CHART_PATH:-"./charts/devbox-controller"}
fi

DEVBOX_BACKUP_ENABLED=${DEVBOX_BACKUP_ENABLED:-"true"}
DEVBOX_BACKUP_DIR=${DEVBOX_BACKUP_DIR:-"/tmp/sealos-backup/devbox-controller"}

adopt_namespaced_resource() {
  local kind="$1"
  local name="$2"
  if kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" >/dev/null 2>&1; then
    kubectl -n "${RELEASE_NAMESPACE}" label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl -n "${RELEASE_NAMESPACE}" annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi
}

adopt_cluster_resource() {
  local kind="$1"
  local name="$2"
  if kubectl get "${kind}" "${name}" >/dev/null 2>&1; then
    kubectl label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi
}

get_cm_value() {
  local namespace="$1"
  local name="$2"
  local key="$3"
  kubectl get configmap "${name}" -n "${namespace}" -o "jsonpath={.data.${key}}" 2>/dev/null || true
}

add_set_string() {
  local key="$1"
  local value="$2"
  HELM_SET_ARGS+=(--set-string "${key}=${value}")
}

backup_ns_resource() {
  local kind="$1"
  local name="$2"
  if kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" >/dev/null 2>&1; then
    kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" -o yaml >> "${DEVBOX_BACKUP_FILE}"
    printf "\n---\n" >> "${DEVBOX_BACKUP_FILE}"
  fi
}

backup_cluster_resource() {
  local kind="$1"
  local name="$2"
  if kubectl get "${kind}" "${name}" >/dev/null 2>&1; then
    kubectl get "${kind}" "${name}" -o yaml >> "${DEVBOX_BACKUP_FILE}"
    printf "\n---\n" >> "${DEVBOX_BACKUP_FILE}"
  fi
}

backup_devbox_resources() {
  if [ "${DEVBOX_BACKUP_ENABLED}" != "true" ]; then
    return
  fi
  local ts
  ts=$(date +%Y%m%d%H%M%S)
  mkdir -p "${DEVBOX_BACKUP_DIR}"
  DEVBOX_BACKUP_FILE="${DEVBOX_BACKUP_DIR}/update-${ts}.yaml"
  : > "${DEVBOX_BACKUP_FILE}"

  backup_cluster_resource customresourcedefinition devboxes.devbox.sealos.io
  backup_cluster_resource customresourcedefinition devboxreleases.devbox.sealos.io
  backup_cluster_resource customresourcedefinition operationrequests.devbox.sealos.io
  backup_cluster_resource clusterrole devbox-manager-role
  backup_cluster_resource clusterrole devbox-metrics-reader
  backup_cluster_resource clusterrolebinding devbox-manager-rolebinding

  if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
    kubectl get namespace "${RELEASE_NAMESPACE}" -o yaml >> "${DEVBOX_BACKUP_FILE}"
    printf "\n---\n" >> "${DEVBOX_BACKUP_FILE}"
  fi
  
  # Backup based on deployment type
  if [ "${DEVBOX_VERSION}" = "v1alpha1" ]; then
    backup_ns_resource deployment devbox-controller-manager
  else
    backup_ns_resource daemonset devbox-controller-manager
  fi
  
  backup_ns_resource serviceaccount devbox-controller-manager
  backup_ns_resource serviceaccount controller-manager
  backup_ns_resource role devbox-leader-election-role
  backup_ns_resource role devbox-default-user
  backup_ns_resource rolebinding devbox-leader-election-rolebinding
  backup_ns_resource rolebinding devbox-default-user-rolebinding
}

backup_devbox_resources

HELM_SET_ARGS=()

# Auto-configure registry settings from sealos-config if available
REGISTRY_ADDR=${registryAddr:-"$(get_cm_value sealos-system sealos-config registryAddr)"}
REGISTRY_USER=${registryUser:-"$(get_cm_value sealos-system sealos-config registryUser)"}
REGISTRY_PASSWORD=${registryPassword:-"$(get_cm_value sealos-system sealos-config registryPassword)"}

if [ -n "${REGISTRY_ADDR}" ]; then
  add_set_string env.registryAddr "${REGISTRY_ADDR}"
fi

if [ -n "${REGISTRY_USER}" ]; then
  add_set_string env.registryUser "${REGISTRY_USER}"
fi

if [ -n "${REGISTRY_PASSWORD}" ]; then
  add_set_string env.registryPassword "${REGISTRY_PASSWORD}"
fi

# Auto-configure devbox-service JWTSecret from sealos-config if devboxService is enabled
# Only apply to v1alpha1 chart (v2alpha2 doesn't have devbox-service)
if [ "${DEVBOX_VERSION}" = "v1alpha1" ]; then
  # Check if devboxService.enabled is true (default is true in values.yaml)
  DEVBOX_SERVICE_ENABLED=${DEVBOX_SERVICE_ENABLED:-"true"}
  if [ "${DEVBOX_SERVICE_ENABLED}" != "false" ]; then
    # Try to get JWTSecret from sealos-config (same as account controller)
    varJwtInternal=${varJwtInternal:-"$(get_cm_value sealos-system sealos-config jwtInternal)"}
    if [ -n "${varJwtInternal}" ]; then
      add_set_string devboxService.env.JWTSecret "${varJwtInternal}"
    fi
    
    # Auto-configure registry credentials for devbox-service if not explicitly set
    if [ -n "${REGISTRY_USER}" ]; then
      add_set_string devboxService.env.USER "${REGISTRY_USER}"
    fi
    if [ -n "${REGISTRY_PASSWORD}" ]; then
      add_set_string devboxService.env.PASSWORD "${REGISTRY_PASSWORD}"
    fi
  fi
fi

if ! helm status "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
    kubectl label namespace "${RELEASE_NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl annotate namespace "${RELEASE_NAMESPACE}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi

  # Adopt resources based on deployment type
  if [ "${DEVBOX_VERSION}" = "v1alpha1" ]; then
    adopt_namespaced_resource deployment devbox-controller-manager
    adopt_namespaced_resource serviceaccount controller-manager
    # Adopt devbox-service resources if enabled
    DEVBOX_SERVICE_ENABLED=${DEVBOX_SERVICE_ENABLED:-"true"}
    if [ "${DEVBOX_SERVICE_ENABLED}" != "false" ]; then
      adopt_namespaced_resource configmap devbox-service-env
      adopt_namespaced_resource service devbox-service
      adopt_namespaced_resource deployment devbox-service
    fi
  else
    adopt_namespaced_resource daemonset devbox-controller-manager
    adopt_namespaced_resource serviceaccount devbox-controller-manager
  fi
  
  adopt_namespaced_resource role devbox-leader-election-role
  adopt_namespaced_resource role devbox-default-user
  adopt_namespaced_resource rolebinding devbox-leader-election-rolebinding
  adopt_namespaced_resource rolebinding devbox-default-user-rolebinding

  adopt_cluster_resource clusterrole devbox-manager-role
  adopt_cluster_resource clusterrole devbox-metrics-reader
  adopt_cluster_resource clusterrolebinding devbox-manager-rolebinding
fi

echo "Installing Devbox Controller ${DEVBOX_VERSION} from ${CHART_PATH}"
helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" "${HELM_SET_ARGS[@]}" ${HELM_OPTS}
