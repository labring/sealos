#!/bin/bash
set -ex

# Default values
RELEASE_NAME=${RELEASE_NAME:-"desktop-frontend"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"sealos"}
CHART_PATH=${CHART_PATH:-"./charts/desktop-frontend"}
AUTO_CONFIG_ENABLED=${AUTO_CONFIG_ENABLED:-"true"}

# HELM_OPTS and HELM_OPTIONS support
# HELM_OPTS: Additional Helm options (e.g., --timeout, --install)
# HELM_OPTIONS: Helm --set parameters passed via environment variable
HELM_OPTS=${HELM_OPTS:-""}
HELM_OPTIONS=${HELM_OPTIONS:-""}

# Build Helm command arguments
HELM_ARGS=""

# Add HELM_OPTIONS if provided
if [ -n "$HELM_OPTIONS" ]; then
  HELM_ARGS="$HELM_ARGS $HELM_OPTIONS"
fi

# Add HELM_OPTS if provided
if [ -n "$HELM_OPTS" ]; then
  HELM_ARGS="$HELM_ARGS $HELM_OPTS"
fi

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

adopt_cluster_resource() {
  local kind="$1"
  local name="$2"
  if kubectl get "${kind}" "${name}" >/dev/null 2>&1; then
    kubectl label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi
}

# Get ConfigMap value
get_cm_value() {
  local namespace="$1"
  local name="$2"
  local key="$3"
  kubectl get configmap "${name}" -n "${namespace}" -o "jsonpath={.data.${key}}" 2>/dev/null || true
}

# Auto configuration from sealos-system ConfigMap
if [ "$AUTO_CONFIG_ENABLED" = "true" ]; then
  echo "Auto-configuring from sealos-system/sealos-config..."

  SEALOS_CLOUD_DOMAIN=$(get_cm_value sealos-system sealos-config cloudDomain)
  SEALOS_CLOUD_PORT=$(get_cm_value sealos-system sealos-config cloudPort)
  SEALOS_JWT_INTERNAL=$(get_cm_value sealos-system sealos-config jwtInternal)
  SEALOS_JWT_REGIONAL=$(get_cm_value sealos-system sealos-config jwtRegional)
  SEALOS_JWT_GLOBAL=$(get_cm_value sealos-system sealos-config jwtGlobal)
  SEALOS_REGION_UID=$(get_cm_value sealos-system sealos-config regionUID)
  SEALOS_DATABASE_MONGODB_URI=$(get_cm_value sealos-system sealos-config databaseMongodbURI)
  SEALOS_DATABASE_GLOBAL_COCKROACHDB_URI=$(get_cm_value sealos-system sealos-config databaseGlobalCockroachdbURI)
  SEALOS_DATABASE_LOCAL_COCKROACHDB_URI=$(get_cm_value sealos-system sealos-config databaseLocalCockroachdbURI)
  SEALOS_PASSWORD_SALT=$(get_cm_value sealos-system sealos-config passwordSalt)

  # Build auto-configuration Helm args
  if [ -n "$SEALOS_CLOUD_DOMAIN" ]; then
    HELM_ARGS="$HELM_ARGS --set-string desktopConfig.cloudDomain=$SEALOS_CLOUD_DOMAIN"
    HELM_ARGS="$HELM_ARGS --set ingress.hosts[0].host=$SEALOS_CLOUD_DOMAIN"
    HELM_ARGS="$HELM_ARGS --set ingress.hosts[0].paths[0].path=/"
    HELM_ARGS="$HELM_ARGS --set ingress.hosts[0].paths[0].pathType=Prefix"
    HELM_ARGS="$HELM_ARGS --set ingress.tls[0].hosts[0]=$SEALOS_CLOUD_DOMAIN"
    HELM_ARGS="$HELM_ARGS --set ingress.tls[0].secretName=wildcard-cert"
  fi

  [ -n "$SEALOS_CLOUD_PORT" ] && HELM_ARGS="$HELM_ARGS --set-string desktopConfig.cloudPort=$SEALOS_CLOUD_PORT"
  [ -n "$SEALOS_JWT_INTERNAL" ] && HELM_ARGS="$HELM_ARGS --set-string desktopConfig.jwtInternal=$SEALOS_JWT_INTERNAL"
  [ -n "$SEALOS_JWT_REGIONAL" ] && HELM_ARGS="$HELM_ARGS --set-string desktopConfig.jwtRegional=$SEALOS_JWT_REGIONAL"
  [ -n "$SEALOS_JWT_GLOBAL" ] && HELM_ARGS="$HELM_ARGS --set-string desktopConfig.jwtGlobal=$SEALOS_JWT_GLOBAL"
  [ -n "$SEALOS_REGION_UID" ] && HELM_ARGS="$HELM_ARGS --set-string desktopConfig.regionUID=$SEALOS_REGION_UID"
  [ -n "$SEALOS_DATABASE_MONGODB_URI" ] && HELM_ARGS="$HELM_ARGS --set-string desktopConfig.databaseMongodbURI=$SEALOS_DATABASE_MONGODB_URI"
  [ -n "$SEALOS_DATABASE_GLOBAL_COCKROACHDB_URI" ] && HELM_ARGS="$HELM_ARGS --set-string desktopConfig.databaseGlobalCockroachdbURI=$SEALOS_DATABASE_GLOBAL_COCKROACHDB_URI"
  [ -n "$SEALOS_DATABASE_LOCAL_COCKROACHDB_URI" ] && HELM_ARGS="$HELM_ARGS --set-string desktopConfig.databaseLocalCockroachdbURI=$SEALOS_DATABASE_LOCAL_COCKROACHDB_URI"
  [ -n "$SEALOS_PASSWORD_SALT" ] && HELM_ARGS="$HELM_ARGS --set-string desktopConfig.passwordSalt=$SEALOS_PASSWORD_SALT"
fi

# Adopt existing resources if fresh install
if ! helm status "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  echo "Fresh install detected, adopting existing resources..."

  kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1 && \
    kubectl label namespace "${RELEASE_NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
  kubectl annotate namespace "${RELEASE_NAMESPACE}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true

  adopt_namespaced_resource serviceaccount desktop-frontend
  adopt_namespaced_resource configmap desktop-frontend-config
  adopt_namespaced_resource service desktop-frontend
  adopt_namespaced_resource deployment desktop-frontend
  adopt_namespaced_resource ingress sealos-desktop

  # Rename old configmap for backward compatibility
  if kubectl -n "${RELEASE_NAMESPACE}" get configmap desktop-frontend-config >/dev/null 2>&1; then
    if ! kubectl -n "${RELEASE_NAMESPACE}" get configmap sealos-desktop-config >/dev/null 2>&1; then
      echo "Renaming configmap desktop-frontend-config to sealos-desktop-config..."
      kubectl -n "${RELEASE_NAMESPACE}" get configmap desktop-frontend-config -o yaml | \
        sed 's/name: desktop-frontend-config/name: sealos-desktop-config/g' | \
        kubectl apply -f - >/dev/null 2>&1 || true
    fi
  fi

  adopt_cluster_resource clusterrole desktop-frontend-manager-role
  adopt_cluster_resource clusterrole desktop-frontend-account-editor-role
  adopt_cluster_resource clusterrole desktop-frontend-app-reader-role
  adopt_cluster_resource clusterrolebinding desktop-frontend-user-role-binding
  adopt_cluster_resource clusterrolebinding desktop-frontend-account-editor-role-binding
  adopt_cluster_resource clusterrolebinding desktop-frontend-app-reader-role-binding

  adopt_namespaced_resource role desktop-frontend-recharge-gift-cm-reader
  adopt_namespaced_resource rolebinding desktop-frontend-recharge-gift-cm-reader-rolebinding
fi

# Ensure ingress has proper Helm labels
if kubectl -n "${RELEASE_NAMESPACE}" get ingress sealos-desktop >/dev/null 2>&1; then
  HAS_HELM_LABEL=$(kubectl -n "${RELEASE_NAMESPACE}" get ingress sealos-desktop -o jsonpath='{.metadata.labels.app\.kubernetes\.io/managed-by}' 2>/dev/null || echo "")
  if [ "${HAS_HELM_LABEL}" != "Helm" ]; then
    echo "Adding Helm labels to ingress sealos-desktop..."
    kubectl -n "${RELEASE_NAMESPACE}" label ingress sealos-desktop app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl -n "${RELEASE_NAMESPACE}" annotate ingress sealos-desktop meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi
fi

# Prepare values files
SERVICE_NAME="desktop-frontend"
USER_VALUES_PATH="/root/.sealos/cloud/values/core/desktop-values.yaml"

# Copy user values template if not exists
if [ ! -f "${USER_VALUES_PATH}" ]; then
  mkdir -p "$(dirname "${USER_VALUES_PATH}")"
  cp "./charts/${SERVICE_NAME}/values.yaml" "${USER_VALUES_PATH}"
fi

# Deploy Helm chart
echo "Deploying Helm chart..."
helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" \
  -f "${USER_VALUES_PATH}" \
  ${HELM_ARGS}
