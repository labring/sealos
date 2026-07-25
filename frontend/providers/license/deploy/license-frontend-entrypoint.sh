#!/bin/bash
set -e

# Default values
RELEASE_NAME=${RELEASE_NAME:-"license-frontend"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"license-frontend"}
CHART_PATH=${CHART_PATH:-"./charts/license-frontend"}
APP_NAMESPACE=${APP_NAMESPACE:-"ns-admin"}

# Get ConfigMap value
get_cm_value() {
  local namespace="$1"
  local name="$2"
  local key="$3"
  kubectl get configmap "${name}" -n "${namespace}" -o "jsonpath={.data.${key}}" 2>/dev/null || true
}

# Auto configuration from sealos-system ConfigMap
declare -a auto_config_args=()

add_set_string() {
  local key="$1"
  local value="$2"
  if [ -n "${value}" ]; then
    value=${value//\\/\\\\}
    value=${value//,/\\,}
    auto_config_args+=(--set-string "${key}=${value}")
  fi
}

MONGODB_URI=$(get_cm_value sealos-system sealos-config databaseMongodbURI)
CLOUD_DOMAIN=$(get_cm_value sealos-system sealos-config cloudDomain)

add_set_string licenseConfig.mongodbURI "$MONGODB_URI"
add_set_string licenseConfig.cloudDomain "$CLOUD_DOMAIN"
add_set_string app.namespace "$APP_NAMESPACE"

assert_adoptable() {
  local managed_by="$1"
  local owner_release="$2"
  local owner_namespace="$3"
  local resource="$4"

  if { [ "${managed_by}" = "Helm" ] || [ -n "${owner_release}" ] || [ -n "${owner_namespace}" ]; } && \
    { [ "${owner_release}" != "${RELEASE_NAME}" ] || [ "${owner_namespace}" != "${RELEASE_NAMESPACE}" ]; }; then
    echo "Refusing to adopt ${resource}: owned by Helm release ${owner_namespace}/${owner_release}" >&2
    return 1
  fi
}

# Adopt existing resources for Helm
adopt_namespaced_resource() {
  local namespace="$1"
  local kind="$2"
  local name="$3"
  if kubectl -n "${namespace}" get "${kind}" "${name}" >/dev/null 2>&1; then
    local managed_by owner_release owner_namespace
    managed_by=$(kubectl -n "${namespace}" get "${kind}" "${name}" -o jsonpath='{.metadata.labels.app\.kubernetes\.io/managed-by}')
    owner_release=$(kubectl -n "${namespace}" get "${kind}" "${name}" -o jsonpath='{.metadata.annotations.meta\.helm\.sh/release-name}')
    owner_namespace=$(kubectl -n "${namespace}" get "${kind}" "${name}" -o jsonpath='{.metadata.annotations.meta\.helm\.sh/release-namespace}')
    assert_adoptable "$managed_by" "$owner_release" "$owner_namespace" "${kind} ${namespace}/${name}"
    echo "Adopting ${kind} ${namespace}/${name}..."
    kubectl -n "${namespace}" label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite
    kubectl -n "${namespace}" annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite
  fi
}

adopt_cluster_resource() {
  local kind="$1"
  local name="$2"
  if kubectl get "${kind}" "${name}" >/dev/null 2>&1; then
    local managed_by owner_release owner_namespace
    managed_by=$(kubectl get "${kind}" "${name}" -o jsonpath='{.metadata.labels.app\.kubernetes\.io/managed-by}')
    owner_release=$(kubectl get "${kind}" "${name}" -o jsonpath='{.metadata.annotations.meta\.helm\.sh/release-name}')
    owner_namespace=$(kubectl get "${kind}" "${name}" -o jsonpath='{.metadata.annotations.meta\.helm\.sh/release-namespace}')
    assert_adoptable "$managed_by" "$owner_release" "$owner_namespace" "${kind} ${name}"
    kubectl label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite
    kubectl annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite
  fi
}

# Pre-check and adopt existing resources before Helm upgrade (both fresh and upgrade)
echo "Checking and adopting existing resources..."
if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  # Adopt namespaced resources
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" serviceaccount license-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" configmap license-frontend-config
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" secret license-frontend-secret
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" service license-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" deployment license-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" ingress license-frontend

  # Adopt cluster resources
  adopt_cluster_resource clusterrole license-frontend-role
  adopt_cluster_resource clusterrole license-frontend-notification-manager
  adopt_cluster_resource clusterrolebinding license-frontend-role-binding
  adopt_cluster_resource clusterrolebinding license-frontend-notification-manager-role-binding
  adopt_cluster_resource clusterrolebinding license-frontend-node-reader-rolebinding
fi

adopt_namespaced_resource "${APP_NAMESPACE}" apps.app.sealos.io license

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
declare -a helm_args=(
  upgrade --install "${RELEASE_NAME}" "${CHART_PATH}"
  --namespace "${RELEASE_NAMESPACE}"
  --create-namespace
  --values "./charts/${SERVICE_NAME}/values.yaml"
  --values "${USER_VALUES_PATH}"
)

declare -a extra_args=()
if [ -n "${HELM_OPTIONS:-}" ]; then
  read -r -a parsed_options <<< "${HELM_OPTIONS}"
  extra_args+=("${parsed_options[@]}")
fi
if [ -n "${HELM_OPTS:-}" ]; then
  read -r -a parsed_opts <<< "${HELM_OPTS}"
  extra_args+=("${parsed_opts[@]}")
fi

helm "${helm_args[@]}" "${auto_config_args[@]}" "${extra_args[@]}"
