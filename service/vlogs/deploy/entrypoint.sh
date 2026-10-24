#!/usr/bin/env bash
set -euo pipefail
umask 077

RELEASE_NAME=${RELEASE_NAME:-vlogs}
RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-sealos}
CHART_PATH=${CHART_PATH:-./charts/vlogs}
USER_VALUES_PATH=${USER_VALUES_PATH:-/root/.sealos/cloud/values/core/vlogs-values.yaml}
BACKUP_DIR=${BACKUP_DIR:-/root/.sealos/cloud/backups/vlogs-$(date +%Y%m%d%H%M%S)}

# Positional arguments are passed intact to Helm (including values with spaces).
# KUBECONFIG selects the same cluster for both kubectl and helm.
# Limit arguments to values overrides: --dry-run must not adopt real resources,
# and --atomic/--force must not delete or replace an existing installation.
args=(-f "$USER_VALUES_PATH" "$@")
while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--values|--set|--set-string|--set-file|--set-json)
      [[ $# -ge 2 ]] || { echo "Missing value for $1" >&2; exit 1; }
      shift 2 ;;
    --values=*|--set=*|--set-string=*|--set-file=*|--set-json=*) shift ;;
    *) echo "Only Helm values overrides are supported; render with helm template for a dry run." >&2; exit 1 ;;
  esac
done
if [[ ! -f "$USER_VALUES_PATH" ]]; then
  mkdir -p "$(dirname "$USER_VALUES_PATH")"
  cp "$CHART_PATH/vlogs-values.yaml" "$USER_VALUES_PATH"
  echo "Configure $USER_VALUES_PATH with the backend, credentials and Kubernetes host whitelist, then rerun." >&2
  exit 1
fi

# Fail on invalid values before touching any existing resources.
helm template "$RELEASE_NAME" "$CHART_PATH" -n "$RELEASE_NAMESPACE" \
  "${args[@]}" >/dev/null

resources=(configmap/service-vlogs-config service/service-vlogs deployment/service-vlogs-deployment)
existing=()
# Check ALL ownership before adopting ANY resource; never steal another release.
for resource in "${resources[@]}"; do
  name=$(kubectl get "$resource" -n "$RELEASE_NAMESPACE" --ignore-not-found -o name)
  [[ -n "$name" ]] || continue
  owner=$(kubectl get "$resource" -n "$RELEASE_NAMESPACE" -o 'jsonpath={.metadata.annotations.meta\.helm\.sh/release-name}')
  owner_namespace=$(kubectl get "$resource" -n "$RELEASE_NAMESPACE" -o 'jsonpath={.metadata.annotations.meta\.helm\.sh/release-namespace}')
  manager=$(kubectl get "$resource" -n "$RELEASE_NAMESPACE" -o 'jsonpath={.metadata.labels.app\.kubernetes\.io/managed-by}')
  if [[ -n "$owner" && "$owner" != "$RELEASE_NAME" ]] ||
     [[ -n "$owner_namespace" && "$owner_namespace" != "$RELEASE_NAMESPACE" ]] ||
     [[ -n "$manager" && "$manager" != Helm ]]; then
    echo "Refusing to adopt $resource: it is managed by another owner." >&2
    exit 1
  fi
  existing+=("$resource")
done

if [[ " ${existing[*]-} " == *" deployment/service-vlogs-deployment "* ]]; then
  selector=$(kubectl get deployment/service-vlogs-deployment -n "$RELEASE_NAMESPACE" -o 'jsonpath={.spec.selector}')
  if [[ "$selector" != '{"matchLabels":{"app":"service-vlogs"}}' ]]; then
    echo "Existing Deployment selector differs from the chart; refusing an incompatible migration." >&2
    exit 1
  fi
fi

if [[ ${#existing[@]} -gt 0 ]]; then
  if [[ -e "$BACKUP_DIR/resources.yaml" || -e "$BACKUP_DIR/values.yaml" ]]; then
    echo "Backup already exists in $BACKUP_DIR; select a new BACKUP_DIR to preserve the recovery snapshot." >&2
    exit 1
  fi
  mkdir -p "$BACKUP_DIR"
  kubectl get "${existing[@]}" -n "$RELEASE_NAMESPACE" -o yaml > "$BACKUP_DIR/resources.yaml"
  cp "$USER_VALUES_PATH" "$BACKUP_DIR/values.yaml"
  echo "Saved pre-upgrade resources and values to $BACKUP_DIR"
  for resource in "${existing[@]}"; do
    kubectl label "$resource" -n "$RELEASE_NAMESPACE" app.kubernetes.io/managed-by=Helm --overwrite
    kubectl annotate "$resource" -n "$RELEASE_NAMESPACE" \
      "meta.helm.sh/release-name=$RELEASE_NAME" \
      "meta.helm.sh/release-namespace=$RELEASE_NAMESPACE" --overwrite
  done
fi

# Do not use --atomic on initial adoption: a failed install must not delete the
# pre-existing Service/Deployment/ConfigMap. Keep them available for recovery.
helm upgrade --install "$RELEASE_NAME" "$CHART_PATH" -n "$RELEASE_NAMESPACE" \
  --create-namespace --wait --timeout 5m "${args[@]}"
