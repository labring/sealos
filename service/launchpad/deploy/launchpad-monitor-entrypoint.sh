#!/bin/bash
set -euo pipefail

HELM_OPTS=${HELM_OPTS:-""}
HELM_OPTIONS=${HELM_OPTIONS:-""}
RELEASE_NAME=${RELEASE_NAME:-"launchpad-monitor"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"sealos"}
CHART_PATH=${CHART_PATH:-"./charts/launchpad-monitor"}
LEGACY_MANIFEST=${LEGACY_MANIFEST:-"./manifests/deploy.yaml"}
SERVICE_NAME="launchpad-monitor"
USER_VALUES_PATH="/root/.sealos/cloud/values/apps/launchpad/${SERVICE_NAME}-values.yaml"
PROMETHEUS_URL=${PROMETHEUS_URL:-"http://vmsingle-victoria-metrics-k8s-stack.vm.svc:8429"}

AUTO_CONFIG_HELM_OPTS=(
  --set-string "launchpadMonitorConfig.vmServiceHost=${PROMETHEUS_URL}"
)
HELM_EXTRA_ARGS=()

if [ -n "${HELM_OPTIONS}" ]; then
  read -r -a PARSED_HELM_OPTIONS <<< "${HELM_OPTIONS}"
  HELM_EXTRA_ARGS+=("${PARSED_HELM_OPTIONS[@]}")
fi

if [ -n "${HELM_OPTS}" ]; then
  read -r -a PARSED_HELM_OPTS <<< "${HELM_OPTS}"
  HELM_EXTRA_ARGS+=("${PARSED_HELM_OPTS[@]}")
fi

if ! helm status "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  if [ -f "${LEGACY_MANIFEST}" ]; then
    kubectl delete -f "${LEGACY_MANIFEST}" --ignore-not-found=true >/dev/null 2>&1 || true
  fi
fi

if [ ! -f "${USER_VALUES_PATH}" ]; then
  mkdir -p "$(dirname "${USER_VALUES_PATH}")"
  cp "./charts/${SERVICE_NAME}/${SERVICE_NAME}-values.yaml" "${USER_VALUES_PATH}"
fi

helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" \
  -f "./charts/${SERVICE_NAME}/values.yaml" \
  -f "${USER_VALUES_PATH}" \
  "${AUTO_CONFIG_HELM_OPTS[@]}" \
  "${HELM_EXTRA_ARGS[@]}"
