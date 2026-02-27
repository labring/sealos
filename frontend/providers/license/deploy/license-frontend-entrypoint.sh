#!/bin/bash
set -e

# Default values
RELEASE_NAME=${RELEASE_NAME:-"license-frontend"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"license-frontend"}
CHART_PATH=${CHART_PATH:-"./charts/license-frontend"}

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

MONGODB_URI=$(get_cm_value sealos-system sealos-config databaseMongodbURI)
CLOUD_DOMAIN=$(get_cm_value sealos-system sealos-config cloudDomain)

[ -n "$MONGODB_URI" ] && AUTO_CONFIG_HELM_OPTS="$AUTO_CONFIG_HELM_OPTS --set-string licenseConfig.mongodbURI=$MONGODB_URI"
[ -n "$CLOUD_DOMAIN" ] && AUTO_CONFIG_HELM_OPTS="$AUTO_CONFIG_HELM_OPTS --set-string licenseConfig.cloudDomain=$CLOUD_DOMAIN"

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

# Pre-check and adopt existing resources before Helm upgrade (both fresh and upgrade)
echo "Checking and adopting existing resources..."
if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  # Adopt namespace
  kubectl label namespace "${RELEASE_NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
  kubectl annotate namespace "${RELEASE_NAMESPACE}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true

  # Adopt namespaced resources
  adopt_namespaced_resource serviceaccount license-frontend
  adopt_namespaced_resource configmap license-frontend-config
  adopt_namespaced_resource secret license-frontend-secret
  adopt_namespaced_resource service license-frontend
  adopt_namespaced_resource deployment license-frontend

  # Adopt cluster resources
  adopt_cluster_resource clusterrole license-frontend-role
  adopt_cluster_resource clusterrole license-frontend-notification-manager
  adopt_cluster_resource clusterrolebinding license-frontend-role-binding
  adopt_cluster_resource clusterrolebinding license-frontend-notification-manager-role-binding
  adopt_cluster_resource clusterrolebinding license-frontend-node-reader-rolebinding
fi

# Prepare values files
SERVICE_NAME="license-frontend"
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
