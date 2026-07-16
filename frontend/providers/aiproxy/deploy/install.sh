#!/bin/bash
set -euo pipefail

timestamp() {
  date +"%Y-%m-%d %T"
}

print() {
  local flag
  flag=$(timestamp)
  echo -e "\033[1;32m\033[1m INFO [$flag] >> $* \033[0m"
}

warn() {
  local flag
  flag=$(timestamp)
  echo -e "\033[33m WARN [$flag] >> $* \033[0m"
}

info() {
  local flag
  flag=$(timestamp)
  echo -e "\033[36m INFO [$flag] >> $* \033[0m"
}

require_value() {
  local name="$1"
  local value="$2"
  if [[ -z "${value}" ]]; then
    echo "Required configuration ${name} is empty" >&2
    exit 1
  fi
}

varJwtInternal=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.jwtInternal}' 2>/dev/null || true)
adminKey=${AIPROXY_ADMIN_KEY:-$(kubectl get configmap aiproxy-env -n aiproxy-system -o jsonpath='{.data.ADMIN_KEY}' 2>/dev/null || true)}
if [[ -z "${adminKey}" ]]; then
  adminKey=$(kubectl get configmap aiproxy-web -n aiproxy-system -o jsonpath='{.data.AI_PROXY_BACKEND_KEY}' 2>/dev/null || true)
fi
SEALOS_CLOUD_DOMAIN=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudDomain}' 2>/dev/null || true)
SEALOS_CLOUD_PORT=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudPort}' 2>/dev/null || true)

require_value sealos-system/sealos-config.jwtInternal "${varJwtInternal}"
require_value aiproxy-system/aiproxy-env.ADMIN_KEY "${adminKey}"
require_value sealos-system/sealos-config.cloudDomain "${SEALOS_CLOUD_DOMAIN}"

CURRENCY_SYMBOL=$(kubectl get deployment -n dbprovider-frontend dbprovider-frontend \
  -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="CURRENCY_SYMBOL")].value}' 2>/dev/null || true)

HELM_ARGS=(
  upgrade --install aiproxy-web charts/aiproxy
  --namespace aiproxy-system
  --create-namespace
)

NODE_COUNT=$(kubectl get nodes --no-headers | wc -l | tr -d ' ')
if [[ "${NODE_COUNT}" -eq 1 ]]; then
  HELM_ARGS+=(--set-string replicas=1)
fi

HELM_ARGS+=(
  --set-string "aiproxy.APP_TOKEN_JWT_KEY=${varJwtInternal}"
  --set-string "aiproxy.AI_PROXY_BACKEND_KEY=${adminKey}"
  --set-string "cloudDomain=${SEALOS_CLOUD_DOMAIN}"
)
if [[ -n "${SEALOS_CLOUD_PORT}" ]]; then
  HELM_ARGS+=(--set-string "cloudPort=${SEALOS_CLOUD_PORT}")
fi
if [[ -n "${CURRENCY_SYMBOL}" ]]; then
  HELM_ARGS+=(--set-string "aiproxy.CURRENCY_SYMBOL=${CURRENCY_SYMBOL}")
fi
if [[ -n "${HELM_OPTIONS:-}" ]]; then
  read -r -a PARSED_HELM_OPTIONS <<< "${HELM_OPTIONS}"
  HELM_ARGS+=("${PARSED_HELM_OPTIONS[@]}")
fi
if [[ -n "${HELM_OPTS:-}" ]]; then
  read -r -a PARSED_HELM_OPTS <<< "${HELM_OPTS}"
  HELM_ARGS+=("${PARSED_HELM_OPTS[@]}")
fi

helm "${HELM_ARGS[@]}"
