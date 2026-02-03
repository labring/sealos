#!/bin/bash
set -ex

HELM_OPTS=${HELM_OPTS:-""}
RELEASE_NAME=${RELEASE_NAME:-"desktop-frontend"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"sealos"}
CHART_PATH=${CHART_PATH:-"./charts/desktop-frontend"}

# Adopt existing resources for Helm
adopt_namespaced_resource() {
  local kind="$1"
  local name="$2"
  if kubectl -n "${RELEASE_NAMESPACE}" get "${kind}" "${name}" >/dev/null 2>&1; then
    echo "Adopting ${kind} ${name}..."
    kubectl -n "${RELEASE_NAMESPACE}" label "${kind}" "${name}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl -n "${RELEASE_NAMESPACE}" annotate "${kind}" "${name}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  else
    echo "Resource ${kind} ${name} does not exist, skipping adoption"
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

# Auto configuration functions
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

add_set() {
  local key="$1"
  local value="$2"
  HELM_SET_ARGS+=(--set "${key}=${value}")
}

HELM_SET_ARGS=()

# Auto configuration from sealos-system configmap
if [ "${AUTO_CONFIG_ENABLED:-"true"}" = "true" ]; then
  SEALOS_CLOUD_DOMAIN=${SEALOS_CLOUD_DOMAIN:-"$(get_cm_value sealos-system sealos-config cloudDomain)"}
  SEALOS_CLOUD_PORT=${SEALOS_CLOUD_PORT:-"$(get_cm_value sealos-system sealos-config cloudPort)"}
  varJwtInternal=${varJwtInternal:-"$(get_cm_value sealos-system sealos-config jwtInternal)"}
  varJwtRegional=${varJwtRegional:-"$(get_cm_value sealos-system sealos-config jwtRegional)"}
  varJwtGlobal=${varJwtGlobal:-"$(get_cm_value sealos-system sealos-config jwtGlobal)"}
  varRegionUID=${varRegionUID:-"$(get_cm_value sealos-system sealos-config regionUID)"}
  varDatabaseMongodbURI=${varDatabaseMongodbURI:-"$(get_cm_value sealos-system sealos-config databaseMongodbURI)"}
  varDatabaseGlobalCockroachdbURI=${varDatabaseGlobalCockroachdbURI:-"$(get_cm_value sealos-system sealos-config databaseGlobalCockroachdbURI)"}
  varDatabaseLocalCockroachdbURI=${varDatabaseLocalCockroachdbURI:-"$(get_cm_value sealos-system sealos-config databaseLocalCockroachdbURI)"}
  varPasswordSalt=${varPasswordSalt:-"$(get_cm_value sealos-system sealos-config passwordSalt)"}

  add_set_string "desktopConfig.cloudDomain" "${SEALOS_CLOUD_DOMAIN}"
  add_set_string "desktopConfig.cloudPort" "${SEALOS_CLOUD_PORT}"
  add_set_string "desktopConfig.jwtInternal" "${varJwtInternal}"
  add_set_string "desktopConfig.jwtRegional" "${varJwtRegional}"
  add_set_string "desktopConfig.jwtGlobal" "${varJwtGlobal}"
  add_set_string "desktopConfig.regionUID" "${varRegionUID}"
  add_set_string "desktopConfig.databaseMongodbURI" "${varDatabaseMongodbURI}"
  add_set_string "desktopConfig.databaseGlobalCockroachdbURI" "${varDatabaseGlobalCockroachdbURI}"
  add_set_string "desktopConfig.databaseLocalCockroachdbURI" "${varDatabaseLocalCockroachdbURI}"
  add_set_string "desktopConfig.passwordSalt" "${varPasswordSalt}"

  # Set ingress host
  if [ -n "${SEALOS_CLOUD_DOMAIN}" ]; then
    HELM_SET_ARGS+=(--set "ingress.hosts[0].host=${SEALOS_CLOUD_DOMAIN}")
    HELM_SET_ARGS+=(--set "ingress.hosts[0].paths[0].path=/")
    HELM_SET_ARGS+=(--set "ingress.hosts[0].paths[0].pathType=Prefix")
    HELM_SET_ARGS+=(--set "ingress.tls[0].hosts[0]=${SEALOS_CLOUD_DOMAIN}")
    HELM_SET_ARGS+=(--set "ingress.tls[0].secretName=wildcard-cert")
  fi
fi

# Environment variables with overrides
CLOUD_DOMAIN=${CLOUD_DOMAIN:-""}
CLOUD_PORT=${CLOUD_PORT:-""}
CERT_SECRET_NAME=${CERT_SECRET_NAME:-"wildcard-cert"}
REGION_UID=${REGION_UID:-""}
DATABASE_MONGODB_URI=${DATABASE_MONGODB_URI:-""}
DATABASE_GLOBAL_COCKROACHDB_URI=${DATABASE_GLOBAL_COCKROACHDB_URI:-""}
DATABASE_LOCAL_COCKROACHDB_URI=${DATABASE_LOCAL_COCKROACHDB_URI:-""}
PASSWORD_SALT=${PASSWORD_SALT:-""}
JWT_INTERNAL=${JWT_INTERNAL:-""}
JWT_REGIONAL=${JWT_REGIONAL:-""}
JWT_GLOBAL=${JWT_GLOBAL:-""}
PASSWORD_ENABLED=${PASSWORD_ENABLED:-"true"}

# Currency and language configuration
CURRENCY=${CURRENCY:-"usd"}
GTM_ID=${GTM_ID:-""}

# Feature flags
GUIDE_ENABLED=${GUIDE_ENABLED:-"false"}
API_ENABLED=${API_ENABLED:-"false"}
RECHARGE_ENABLED=${RECHARGE_ENABLED:-"false"}
ENTERPRISE_REAL_NAME_AUTH_ENABLED=${ENTERPRISE_REAL_NAME_AUTH_ENABLED:-"false"}
TRACKING_ENABLED=${TRACKING_ENABLED:-"false"}
REAL_NAME_AUTH_ENABLED=${REAL_NAME_AUTH_ENABLED:-"false"}
LICENSE_CHECK_ENABLED=${LICENSE_CHECK_ENABLED:-"false"}

# OAuth providers
GITHUB_ENABLED=${GITHUB_ENABLED:-"false"}
GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID:-""}
GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET:-""}

WECHAT_ENABLED=${WECHAT_ENABLED:-"false"}
WECHAT_CLIENT_ID=${WECHAT_CLIENT_ID:-""}
WECHAT_CLIENT_SECRET=${WECHAT_CLIENT_SECRET:-""}

GOOGLE_ENABLED=${GOOGLE_ENABLED:-"false"}
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-""}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-""}

OAUTH2_ENABLED=${OAUTH2_ENABLED:-"false"}
OAUTH2_CALLBACK_URL=${OAUTH2_CALLBACK_URL:-""}
OAUTH2_CLIENT_ID=${OAUTH2_CLIENT_ID:-""}
OAUTH2_CLIENT_SECRET=${OAUTH2_CLIENT_SECRET:-""}
OAUTH2_AUTH_URL=${OAUTH2_AUTH_URL:-""}
OAUTH2_TOKEN_URL=${OAUTH2_TOKEN_URL:-""}
OAUTH2_USER_INFO_URL=${OAUTH2_USER_INFO_URL:-""}

# Captcha configuration
TURNSTILE_ENABLED=${TURNSTILE_ENABLED:-"false"}
TURNSTILE_SITE_KEY=${TURNSTILE_SITE_KEY:-""}
TURNSTILE_SECRET_KEY=${TURNSTILE_SECRET_KEY:-""}

# Apply environment variable overrides
if [ -n "${CLOUD_DOMAIN}" ]; then
  add_set_string "desktopConfig.cloudDomain" "${CLOUD_DOMAIN}"
fi

if [ -n "${CLOUD_PORT}" ]; then
  add_set_string "desktopConfig.cloudPort" "${CLOUD_PORT}"
fi

if [ -n "${CERT_SECRET_NAME}" ]; then
  add_set_string "desktopConfig.certSecretName" "${CERT_SECRET_NAME}"
fi

if [ -n "${REGION_UID}" ]; then
  add_set_string "desktopConfig.regionUID" "${REGION_UID}"
fi

if [ -n "${DATABASE_MONGODB_URI}" ]; then
  add_set_string "desktopConfig.databaseMongodbURI" "${DATABASE_MONGODB_URI}"
fi

if [ -n "${DATABASE_GLOBAL_COCKROACHDB_URI}" ]; then
  add_set_string "desktopConfig.databaseGlobalCockroachdbURI" "${DATABASE_GLOBAL_COCKROACHDB_URI}"
fi

if [ -n "${DATABASE_LOCAL_COCKROACHDB_URI}" ]; then
  add_set_string "desktopConfig.databaseLocalCockroachdbURI" "${DATABASE_LOCAL_COCKROACHDB_URI}"
fi

if [ -n "${PASSWORD_SALT}" ]; then
  add_set_string "desktopConfig.passwordSalt" "${PASSWORD_SALT}"
fi

if [ -n "${JWT_INTERNAL}" ]; then
  add_set_string "desktopConfig.jwtInternal" "${JWT_INTERNAL}"
fi

if [ -n "${JWT_REGIONAL}" ]; then
  add_set_string "desktopConfig.jwtRegional" "${JWT_REGIONAL}"
fi

if [ -n "${JWT_GLOBAL}" ]; then
  add_set_string "desktopConfig.jwtGlobal" "${JWT_GLOBAL}"
fi

# Currency configuration
if [ "${CURRENCY}" = "cny" ]; then
  add_set "desktopConfig.version" "cn"
  add_set "desktopConfig.forcedLanguage" "zh"
  add_set "desktopConfig.currencySymbol" "shellCoin"
else
  add_set "desktopConfig.version" "en"
  add_set "desktopConfig.forcedLanguage" "en"
  add_set "desktopConfig.currencySymbol" "usd"
fi

if [ -n "${GTM_ID}" ]; then
  add_set_string "desktopConfig.gtmId" "${GTM_ID}"
fi

# Feature flags
add_set "desktopConfig.guideEnabled" "${GUIDE_ENABLED}"
add_set "desktopConfig.apiEnabled" "${API_ENABLED}"
add_set "desktopConfig.rechargeEnabled" "${RECHARGE_ENABLED}"
add_set "desktopConfig.enterpriseRealNameAuthEnabled" "${ENTERPRISE_REAL_NAME_AUTH_ENABLED}"
add_set "desktopConfig.trackingEnabled" "${TRACKING_ENABLED}"
add_set "desktopConfig.realNameAuthEnabled" "${REAL_NAME_AUTH_ENABLED}"
add_set "desktopConfig.licenseCheckEnabled" "${LICENSE_CHECK_ENABLED}"

# OAuth providers
add_set "desktopConfig.githubEnabled" "${GITHUB_ENABLED}"
if [ -n "${GITHUB_CLIENT_ID}" ]; then
  add_set_string "desktopConfig.githubClientId" "${GITHUB_CLIENT_ID}"
fi
if [ -n "${GITHUB_CLIENT_SECRET}" ]; then
  add_set_string "desktopConfig.githubClientSecret" "${GITHUB_CLIENT_SECRET}"
fi

add_set "desktopConfig.wechatEnabled" "${WECHAT_ENABLED}"
if [ -n "${WECHAT_CLIENT_ID}" ]; then
  add_set_string "desktopConfig.wechatClientId" "${WECHAT_CLIENT_ID}"
fi
if [ -n "${WECHAT_CLIENT_SECRET}" ]; then
  add_set_string "desktopConfig.wechatClientSecret" "${WECHAT_CLIENT_SECRET}"
fi

add_set "desktopConfig.googleEnabled" "${GOOGLE_ENABLED}"
if [ -n "${GOOGLE_CLIENT_ID}" ]; then
  add_set_string "desktopConfig.googleClientId" "${GOOGLE_CLIENT_ID}"
fi
if [ -n "${GOOGLE_CLIENT_SECRET}" ]; then
  add_set_string "desktopConfig.googleClientSecret" "${GOOGLE_CLIENT_SECRET}"
fi

add_set "desktopConfig.oauth2Enabled" "${OAUTH2_ENABLED}"
if [ -n "${OAUTH2_CALLBACK_URL}" ]; then
  add_set_string "desktopConfig.oauth2CallbackUrl" "${OAUTH2_CALLBACK_URL}"
fi
if [ -n "${OAUTH2_CLIENT_ID}" ]; then
  add_set_string "desktopConfig.oauth2ClientId" "${OAUTH2_CLIENT_ID}"
fi
if [ -n "${OAUTH2_CLIENT_SECRET}" ]; then
  add_set_string "desktopConfig.oauth2ClientSecret" "${OAUTH2_CLIENT_SECRET}"
fi
if [ -n "${OAUTH2_AUTH_URL}" ]; then
  add_set_string "desktopConfig.oauth2AuthUrl" "${OAUTH2_AUTH_URL}"
fi
if [ -n "${OAUTH2_TOKEN_URL}" ]; then
  add_set_string "desktopConfig.oauth2TokenUrl" "${OAUTH2_TOKEN_URL}"
fi
if [ -n "${OAUTH2_USER_INFO_URL}" ]; then
  add_set_string "desktopConfig.oauth2UserInfoUrl" "${OAUTH2_USER_INFO_URL}"
fi

# Captcha
add_set "desktopConfig.turnstileEnabled" "${TURNSTILE_ENABLED}"
if [ -n "${TURNSTILE_SITE_KEY}" ]; then
  add_set_string "desktopConfig.turnstileSiteKey" "${TURNSTILE_SITE_KEY}"
fi
if [ -n "${TURNSTILE_SECRET_KEY}" ]; then
  add_set_string "desktopConfig.turnstileSecretKey" "${TURNSTILE_SECRET_KEY}"
fi

# Adopt existing resources if this is a fresh install
# Check if helm release exists
if ! helm status "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  echo "Fresh install detected (Helm release does not exist), adopting existing resources..."

  if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
    echo "Labeling namespace ${RELEASE_NAMESPACE}..."
    kubectl label namespace "${RELEASE_NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl annotate namespace "${RELEASE_NAMESPACE}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi

  echo "Adopting namespaced resources..."
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
else
  echo "Helm release exists, skipping resource adoption"
fi

# Deploy helm chart
# Always ensure ingress has proper labels before helm upgrade
echo "Ensuring sealos-desktop ingress has proper Helm labels..."
if kubectl -n "${RELEASE_NAMESPACE}" get ingress sealos-desktop >/dev/null 2>&1; then
  HAS_HELM_LABEL=$(kubectl -n "${RELEASE_NAMESPACE}" get ingress sealos-desktop -o jsonpath='{.metadata.labels.app\.kubernetes\.io/managed-by}' 2>/dev/null || echo "")
  if [ "${HAS_HELM_LABEL}" != "Helm" ]; then
    echo "Adding Helm labels to existing ingress sealos-desktop..."
    kubectl -n "${RELEASE_NAMESPACE}" label ingress sealos-desktop app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl -n "${RELEASE_NAMESPACE}" annotate ingress sealos-desktop meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  else
    echo "Ingress sealos-desktop already has proper Helm labels"
  fi
fi

helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" "${HELM_SET_ARGS[@]}" ${HELM_OPTS}
