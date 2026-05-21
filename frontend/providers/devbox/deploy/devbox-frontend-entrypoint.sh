#!/bin/bash
set -e

RELEASE_NAME=${RELEASE_NAME:-"devbox-frontend"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"devbox-frontend"}
CHART_PATH=${CHART_PATH:-"./charts/devbox-frontend"}
HELM_OPTS=${HELM_OPTS:-""}
HELM_OPTIONS=${HELM_OPTIONS:-""}
AUTO_CONFIG_HELM_OPTS=""

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
    AUTO_CONFIG_HELM_OPTS="${AUTO_CONFIG_HELM_OPTS} --set-string ${key}=${value}"
  fi
}

SEALOS_CLOUD_DOMAIN=${SEALOS_CLOUD_DOMAIN:-"${cloudDomain:-$(get_cm_value sealos-system sealos-config cloudDomain)}"}
add_set_string devboxConfig.cloudDomain "${SEALOS_CLOUD_DOMAIN}"
SEALOS_CLOUD_PORT=${SEALOS_CLOUD_PORT:-"${cloudPort:-$(get_cm_value sealos-system sealos-config cloudPort)}"}
add_set_string devboxConfig.cloudPort "${SEALOS_CLOUD_PORT}"
SEALOS_HTTP_PORT=${SEALOS_HTTP_PORT:-"${httpPort:-$(get_cm_value sealos-system sealos-config httpPort)}"}
add_set_string devboxConfig.httpPort "${SEALOS_HTTP_PORT}"
SEALOS_DISABLE_HTTPS=${SEALOS_DISABLE_HTTPS:-"${disableHttps:-$(get_cm_value sealos-system sealos-config disableHttps)}"}
add_set_string devboxConfig.disableHttps "${SEALOS_DISABLE_HTTPS}"
SEALOS_CERT_SECRET_NAME=${SEALOS_CERT_SECRET_NAME:-"${certSecretName:-$(get_cm_value sealos-system sealos-config certSecretName)}"}
add_set_string devboxConfig.certSecretName "${SEALOS_CERT_SECRET_NAME}"
SEALOS_DATABASE_GLOBAL_COCKROACHDB_URI=${SEALOS_DATABASE_GLOBAL_COCKROACHDB_URI:-"${databaseGlobalCockroachdbURI:-$(get_cm_value sealos-system sealos-config databaseGlobalCockroachdbURI)}"}
add_set_string devboxConfig.databaseUrl "${SEALOS_DATABASE_GLOBAL_COCKROACHDB_URI}"
SEALOS_JWT_INTERNAL=${SEALOS_JWT_INTERNAL:-"${jwtInternal:-$(get_cm_value sealos-system sealos-config jwtInternal)}"}
add_set_string devboxConfig.jwtSecret "${SEALOS_JWT_INTERNAL}"
SEALOS_REGION_UID=${SEALOS_REGION_UID:-"${regionUid:-${regionUID:-$(get_cm_value sealos-system sealos-config regionUID)}}"}
add_set_string devboxConfig.regionUid "${SEALOS_REGION_UID}"
add_set_string devboxConfig.databaseProvider "${databaseProvider:-}"
add_set_string devboxConfig.tlsRejectUnauthorized "${tlsRejectUnauthorized:-}"
add_set_string devboxConfig.sshDomain "${sshDomain:-}"
add_set_string devboxConfig.registryAddr "${registryAddr:-}"
add_set_string devboxConfig.monitorUrl "${monitorUrl:-}"
add_set_string devboxConfig.accountUrl "${accountUrl:-}"
add_set_string devboxConfig.rootRuntimeNamespace "${rootRuntimeNamespace:-}"
add_set_string devboxConfig.currencySymbol "${currencySymbol:-}"
add_set_string devboxConfig.gpuEnable "${gpuEnable:-}"
add_set_string devboxConfig.storageLimit "${storageLimit:-}"
add_set_string devboxConfig.runtimeClassName "${runtimeClassName:-}"
add_set_string devboxConfig.retagSvcUrl "${retagSvcUrl:-}"
add_set_string devboxConfig.enableImportFeature "${enableImportFeature:-}"
add_set_string devboxConfig.enableWebideFeature "${enableWebideFeature:-}"
add_set_string devboxConfig.enableAdvancedConfig "${enableAdvancedConfig:-}"
add_set_string devboxConfig.cpuSlideMarkList "${cpuSlideMarkList:-}"
add_set_string devboxConfig.memorySlideMarkList "${memorySlideMarkList:-}"
add_set_string devboxConfig.devboxDomainChallengeSecret "${devboxDomainChallengeSecret:-}"
add_set_string devboxConfig.nfsStorageClassName "${nfsStorageClassName:-}"
add_set_string devboxConfig.customScripts "${customScripts:-}"
add_set_string devboxConfig.documentUrlZh "${documentUrlZh:-}"
add_set_string devboxConfig.documentUrlEn "${documentUrlEn:-}"
add_set_string devboxConfig.privacyUrlZh "${privacyUrlZh:-}"
add_set_string devboxConfig.privacyUrlEn "${privacyUrlEn:-}"

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

adopt_cluster_resource() {
  local kind="$1"
  local name="$2"
  if kubectl get "${kind}" "${name}" >/dev/null 2>&1; then
    echo "Adopting ${kind} ${name}..."
    kubectl label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi
}

echo "Checking and adopting existing resources..."
if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  kubectl label namespace "${RELEASE_NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
  kubectl annotate namespace "${RELEASE_NAMESPACE}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true

  adopt_namespaced_resource "${RELEASE_NAMESPACE}" configmap devbox-frontend-config
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" service devbox-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" deployment devbox-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" ingress devbox-frontend
  adopt_namespaced_resource "${RELEASE_NAMESPACE}" ingress devbox-challenge
fi

adopt_namespaced_resource app-system apps.app.sealos.io devbox


SERVICE_NAME="devbox-frontend"
USER_VALUES_PATH="/root/.sealos/cloud/values/core/${SERVICE_NAME}-values.yaml"

if [ ! -f "${USER_VALUES_PATH}" ]; then
  mkdir -p "$(dirname "${USER_VALUES_PATH}")"
  cp "./charts/devbox-frontend/devbox-frontend-values.yaml" "${USER_VALUES_PATH}"
fi

HELM_ARGS="${AUTO_CONFIG_HELM_OPTS} ${HELM_OPTIONS} ${HELM_OPTS}"

echo "Deploying Helm chart..."
helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" \
  -f "./charts/devbox-frontend/values.yaml" \
  -f "${USER_VALUES_PATH}" \
  ${HELM_ARGS}
