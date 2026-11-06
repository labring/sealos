#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHART_PATH="${CHART_PATH:-${SCRIPT_DIR}/charts/app-controller}"
RELEASE_NAMESPACE="${RELEASE_NAMESPACE:-app-system}"
USER_VALUES_FILE="${USER_VALUES_FILE:-/root/.sealos/cloud/values/core/app-controller-values.yaml}"
HELM_TIMEOUT="${HELM_TIMEOUT:-5m}"
RELEASE_NAME=app-controller

# Validate all existing ownership before adopting anything. Never delete workloads.
resources() {
cat <<'RESOURCES'
clusterrole app-manager-role cluster
clusterrole app-metrics-reader cluster
clusterrole app-proxy-role cluster
clusterrolebinding app-manager-rolebinding cluster
clusterrolebinding app-proxy-rolebinding cluster
deployment app-controller-manager namespaced
role app-default-user namespaced
role app-leader-election-role namespaced
rolebinding app-default-user-rolebinding namespaced
rolebinding app-leader-election-rolebinding namespaced
service app-controller-manager-metrics-service namespaced
serviceaccount app-controller-manager namespaced
RESOURCES
}
while read -r kind name scope; do
  args=(); [[ "$scope" != namespaced ]] || args=(-n "$RELEASE_NAMESPACE")
  owners=$(kubectl get "$kind" "$name" "${args[@]}" --ignore-not-found -o 'jsonpath={.metadata.annotations.meta\.helm\.sh/release-name}{"|"}{.metadata.annotations.meta\.helm\.sh/release-namespace}')
  [[ -z "$owners" || "$owners" == '|' || "$owners" == "$RELEASE_NAME|$RELEASE_NAMESPACE" ]] || {
    echo "Refusing to adopt $kind/$name owned by $owners" >&2; exit 1;
  }
done < <(resources)
[[ -f "$USER_VALUES_FILE" ]] || {
  mkdir -p "$(dirname "$USER_VALUES_FILE")"
  cp "$CHART_PATH/app-controller-values.yaml" "$USER_VALUES_FILE"
  chmod 600 "$USER_VALUES_FILE"
}
while read -r kind name scope; do
  args=(); [[ "$scope" != namespaced ]] || args=(-n "$RELEASE_NAMESPACE")
  existing=$(kubectl get "$kind" "$name" "${args[@]}" --ignore-not-found -o name)
  [[ -n "$existing" ]] || continue
  kubectl label "$kind" "$name" "${args[@]}" app.kubernetes.io/managed-by=Helm --overwrite
  kubectl annotate "$kind" "$name" "${args[@]}" meta.helm.sh/release-name="$RELEASE_NAME" meta.helm.sh/release-namespace="$RELEASE_NAMESPACE" --overwrite
done < <(resources)
helm upgrade --install "$RELEASE_NAME" "$CHART_PATH" -n "$RELEASE_NAMESPACE" --create-namespace -f "$USER_VALUES_FILE" --wait --timeout "$HELM_TIMEOUT"
