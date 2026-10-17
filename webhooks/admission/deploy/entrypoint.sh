#!/usr/bin/env bash
set -euo pipefail

readonly RELEASE_NAME=admission-webhook
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RELEASE_NAMESPACE="${RELEASE_NAMESPACE:-sealos-system}"
CHART_PATH="${CHART_PATH:-${SCRIPT_DIR}/charts/admission-webhook}"
USER_VALUES_FILE="${USER_VALUES_FILE:-/root/.sealos/cloud/values/core/admission-webhook-values.yaml}"
HELM_TIMEOUT="${HELM_TIMEOUT:-5m}"

die() { echo "error: $*" >&2; exit 1; }
ensure_values() {
  [[ -f "$USER_VALUES_FILE" ]] && return
  mkdir -p "$(dirname "$USER_VALUES_FILE")"
  cp "$CHART_PATH/admission-webhook-values.yaml" "$USER_VALUES_FILE"
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
  kubectl delete mutatingwebhookconfiguration admission-mutating-webhook-configuration --ignore-not-found
  kubectl delete validatingwebhookconfiguration admission-validating-webhook-configuration --ignore-not-found
  while IFS=' ' read -r kind name; do
    [[ -z "$name" ]] || kubectl delete "$kind" "$name" -n "$RELEASE_NAMESPACE" --ignore-not-found
  done <<'RESOURCES'
deployment admission-controller-manager
service admission-webhook-service
service admission-controller-manager-metrics-service
certificate admission-serving-cert
issuer admission-selfsigned-issuer
serviceaccount admission-controller-manager
role admission-leader-election-role
role admission-manager-role
role admission-proxy-role
rolebinding admission-leader-election-rolebinding
rolebinding admission-manager-rolebinding
rolebinding admission-proxy-rolebinding
RESOURCES
  kubectl delete clusterrole admission-manager-role admission-metrics-reader admission-proxy-role --ignore-not-found
  kubectl delete clusterrolebinding admission-manager-rolebinding admission-proxy-rolebinding --ignore-not-found
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
  echo "Removed Helm release $RELEASE_NAME; preserved $USER_VALUES_FILE"
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
