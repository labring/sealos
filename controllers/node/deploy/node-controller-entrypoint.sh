#!/bin/bash
set -ex

HELM_OPTS=${HELM_OPTS:-""}
RELEASE_NAME=${RELEASE_NAME:-"node-controller"}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-"node-system"}
CHART_PATH=${CHART_PATH:-"./charts/node-controller"}

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

if ! helm status "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
  if kubectl get namespace "${RELEASE_NAMESPACE}" >/dev/null 2>&1; then
    kubectl label namespace "${RELEASE_NAMESPACE}" app.kubernetes.io/managed-by=Helm --overwrite >/dev/null 2>&1 || true
    kubectl annotate namespace "${RELEASE_NAMESPACE}" meta.helm.sh/release-name="${RELEASE_NAME}" meta.helm.sh/release-namespace="${RELEASE_NAMESPACE}" --overwrite >/dev/null 2>&1 || true
  fi

  adopt_namespaced_resource configmap node-gpu-info
  adopt_namespaced_resource serviceaccount node-controller-manager
  adopt_namespaced_resource role node-leader-election-role
  adopt_namespaced_resource role node-gpu-info-cm-reader
  adopt_namespaced_resource rolebinding node-leader-election-rolebinding
  adopt_namespaced_resource rolebinding node-gpu-info-cm-reader-rolebinding
  adopt_namespaced_resource service node-controller-manager-metrics-service
  adopt_namespaced_resource deployment node-controller-manager
  adopt_namespaced_resource issuer node-selfsigned-issuer
  adopt_namespaced_resource certificate node-serving-cert

  adopt_cluster_resource clusterrole node-manager-role
  adopt_cluster_resource clusterrole node-metrics-reader
  adopt_cluster_resource clusterrole node-proxy-role
  adopt_cluster_resource clusterrolebinding node-manager-rolebinding
  adopt_cluster_resource clusterrolebinding node-proxy-rolebinding
fi

helm upgrade -i "${RELEASE_NAME}" -n "${RELEASE_NAMESPACE}" --create-namespace "${CHART_PATH}" ${HELM_OPTS}
