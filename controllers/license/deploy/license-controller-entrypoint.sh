#!/bin/bash
set -ex

HELM_OPTS=${HELM_OPTS:-""}
RELEASE_NAME=${RELEASE_NAME:-"license"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"license-system"}
CHART_PATH=${CHART_PATH:-"./charts/license-controller"}

# Clean up old resources (for backward compatibility)
kubectl delete clusterrole kube-system-namespace-read-cluster-role --ignore-not-found
kubectl delete clusterrolebinding license-controller-role-binding --ignore-not-found
kubectl delete deployment license-controller-manager -n account-system --ignore-not-found
kubectl delete service license-controller-manager-metrics-service -n account-system --ignore-not-found
kubectl delete clusterrolebinding license-proxy-rolebinding --ignore-not-found
kubectl delete clusterrolebinding license-manager-rolebinding --ignore-not-found
kubectl delete rolebinding license-leader-election-rolebinding -n account-system --ignore-not-found
kubectl delete clusterrole license-manager-role --ignore-not-found
kubectl delete clusterrole license-metrics-reader --ignore-not-found
kubectl delete clusterrole license-proxy-role --ignore-not-found
kubectl delete role license-leader-election-role -n account-system --ignore-not-found
kubectl delete serviceaccount license-controller-manager -n account-system --ignore-not-found

# Prepare values files
SERVICE_NAME="license-controller"
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
  ${HELM_OPTS}

# Apply CRDs
helm show crds ./charts/license-controller | kubectl apply -f - --server-side --force-conflicts
