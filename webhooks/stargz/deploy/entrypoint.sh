#!/usr/bin/env bash
set -euo pipefail

readonly RELEASE_NAME=stargz-webhook
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_NAMESPACE="${RELEASE_NAMESPACE:-sealos-system}"
CHART_PATH="${CHART_PATH:-${SCRIPT_DIR}/charts/stargz-webhook}"
USER_VALUES_FILE="${USER_VALUES_FILE:-/root/.sealos/cloud/values/core/stargz-webhook-values.yaml}"
HELM_TIMEOUT="${HELM_TIMEOUT:-5m}"

die() { echo "error: $*" >&2; exit 1; }
ensure_values() {
  [[ -f "$USER_VALUES_FILE" ]] && return
  mkdir -p "$(dirname "$USER_VALUES_FILE")"
  cp "$CHART_PATH/stargz-webhook-values.yaml" "$USER_VALUES_FILE"
  chmod 600 "$USER_VALUES_FILE"
  echo "Created user values: $USER_VALUES_FILE"
}
release_exists() {
  local releases
  releases=$(helm list --all --short --filter "^${RELEASE_NAME}$" -n "$RELEASE_NAMESPACE") ||
    die "unable to query Helm releases in namespace $RELEASE_NAMESPACE"
  [[ "$releases" == "$RELEASE_NAME" ]]
}
delete_legacy_resources() {
  local kind name
  kubectl delete mutatingwebhookconfiguration pod-stargz-runtime-injector pod-stargz-runtime-injector-mutating-webhook-configuration --ignore-not-found
  while IFS=' ' read -r kind name; do
    [[ -z "$name" ]] || kubectl delete "$kind" "$name" -n "$RELEASE_NAMESPACE" --ignore-not-found
  done <<'RESOURCES'
deployment pod-stargz-runtime-injector
deployment pod-stargz-runtime-injector-controller-manager
service pod-stargz-runtime-injector
service pod-stargz-runtime-injector-webhook-service
service pod-stargz-runtime-injector-controller-manager-metrics-service
certificate stargz-runtime-injector-serving-cert
certificate pod-stargz-runtime-injector-serving-cert
issuer stargz-runtime-injector-selfsigned-issuer
issuer pod-stargz-runtime-injector-selfsigned-issuer
serviceaccount pod-stargz-runtime-injector
serviceaccount pod-stargz-runtime-injector-controller-manager
role pod-stargz-runtime-injector-leader-election-role
rolebinding pod-stargz-runtime-injector-leader-election-rolebinding
RESOURCES
  kubectl delete clusterrole pod-stargz-runtime-injector-manager-role pod-stargz-runtime-injector-metrics-auth-role pod-stargz-runtime-injector-metrics-reader stargz-runtime-injector-manager-role --ignore-not-found
  kubectl delete clusterrolebinding pod-stargz-runtime-injector-manager-rolebinding pod-stargz-runtime-injector-metrics-auth-rolebinding stargz-runtime-injector-manager-rolebinding --ignore-not-found
  # RuntimeClass/stargz remains available to existing Pods and node handlers.
  # Add Helm ownership so the chart can retain and manage the existing object.
  if kubectl get runtimeclass stargz >/dev/null 2>&1; then
    local owner owner_namespace
    owner=$(kubectl get runtimeclass stargz -o jsonpath='{.metadata.annotations.meta\.helm\.sh/release-name}')
    owner_namespace=$(kubectl get runtimeclass stargz -o jsonpath='{.metadata.annotations.meta\.helm\.sh/release-namespace}')
    [[ -z "$owner" || ( "$owner" == "$RELEASE_NAME" && "$owner_namespace" == "$RELEASE_NAMESPACE" ) ]] ||
      die "RuntimeClass/stargz belongs to Helm release $owner in namespace $owner_namespace"
    kubectl label runtimeclass stargz app.kubernetes.io/managed-by=Helm --overwrite
    kubectl annotate runtimeclass stargz \
      meta.helm.sh/release-name="$RELEASE_NAME" \
      meta.helm.sh/release-namespace="$RELEASE_NAMESPACE" --overwrite
  fi
}
apply() {
  ensure_values
  if ! release_exists; then delete_legacy_resources; fi
  helm upgrade --install "$RELEASE_NAME" "$CHART_PATH" --namespace "$RELEASE_NAMESPACE" --create-namespace --reset-values --values "$USER_VALUES_FILE" --wait --timeout "$HELM_TIMEOUT"
}
delete_release() {
  if release_exists; then
    helm uninstall "$RELEASE_NAME" -n "$RELEASE_NAMESPACE" --wait --timeout "$HELM_TIMEOUT"
  fi
  echo "Removed Helm release $RELEASE_NAME; preserved $USER_VALUES_FILE and RuntimeClass/stargz"
}
usage() { echo "Usage: $0 [apply|delete]"; }
main() {
  command -v helm >/dev/null || die "helm is required"
  command -v kubectl >/dev/null || die "kubectl is required"
  [[ -f "$CHART_PATH/Chart.yaml" ]] || die "chart not found: $CHART_PATH"
  case "${1:-apply}" in
    apply|upgrade) apply ;;
    delete|uninstall) delete_release ;;
    help|-h|--help) usage ;;
    *) usage >&2; exit 2 ;;
  esac
}
main "$@"
