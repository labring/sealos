#!/bin/bash
set -euo pipefail

HELM_OPTS=${HELM_OPTS:-""}
RELEASE_NAME=${RELEASE_NAME:-"user-controller"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"user-system"}
CHART_PATH=${CHART_PATH:-"./charts/user-controller"}

# Clean up old resources
kubectl delete -f ./drop/ --ignore-not-found

# Get cloud domain from configmap
SEALOS_CLOUD_DOMAIN=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudDomain}')

# Prepare values files
SERVICE_NAME="user-controller"
USER_VALUES_PATH="/root/.sealos/cloud/values/core/${SERVICE_NAME}-values.yaml"

# Copy user values template if not exists
if [ ! -f "${USER_VALUES_PATH}" ]; then
  mkdir -p "$(dirname "${USER_VALUES_PATH}")"
  cp "./charts/${SERVICE_NAME}/${SERVICE_NAME}-values.yaml" "${USER_VALUES_PATH}"
fi

# Deploy Helm chart
helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" \
  -f "./charts/${SERVICE_NAME}/values.yaml" \
  -f "${USER_VALUES_PATH}" \
  --set cloudAPIServerDomain=${SEALOS_CLOUD_DOMAIN} \
  ${HELM_OPTS}

# Apply CRDs
helm show crds ./charts/${SERVICE_NAME} | kubectl apply -f - --server-side --force-conflicts
