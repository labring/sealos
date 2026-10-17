#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
command -v helm >/dev/null || { echo 'helm is required' >&2; exit 1; }
helm lint "$ROOT/webhooks/admission/deploy/charts/admission-webhook"
helm lint "$ROOT/webhooks/stargz/deploy/charts/stargz-webhook"
helm template admission-webhook "$ROOT/webhooks/admission/deploy/charts/admission-webhook" -n sealos-system >/dev/null
helm template stargz-webhook "$ROOT/webhooks/stargz/deploy/charts/stargz-webhook" -n sealos-system >/dev/null
shellcheck "$ROOT/webhooks/admission/deploy/entrypoint.sh" "$ROOT/webhooks/stargz/deploy/entrypoint.sh" "$ROOT/webhooks/stargz/deploy/apply-cluster-stargz-webhook.sh"

TEMP=$(mktemp -d)
trap 'rm -rf "$TEMP"' EXIT
mkdir -p "$TEMP/bin"
cat > "$TEMP/bin/helm" <<'HELM'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$CALL_LOG"
if [[ $1 == status ]]; then [[ -f "$RELEASE_STATE" ]]; exit; fi
if [[ $1 == upgrade ]]; then touch "$RELEASE_STATE"; fi
HELM
cat > "$TEMP/bin/kubectl" <<'KUBECTL'
#!/usr/bin/env bash
printf 'kubectl %s\n' "$*" >> "$CALL_LOG"
if [[ $1 == get && $2 == runtimeclass ]]; then
  case "$*" in *jsonpath*) exit 0;; esac
  exit 1
fi
exit 0
KUBECTL
chmod +x "$TEMP/bin/helm" "$TEMP/bin/kubectl"
export PATH="$TEMP/bin:$PATH" CALL_LOG="$TEMP/calls" RELEASE_STATE="$TEMP/release"

USER_VALUES_FILE="$TEMP/admission-values.yaml" bash "$ROOT/webhooks/admission/deploy/entrypoint.sh" apply >/dev/null
grep -q 'replicaCount: 1' "$TEMP/admission-values.yaml"
printf 'replicaCount: 3\n' > "$TEMP/admission-values.yaml"
USER_VALUES_FILE="$TEMP/admission-values.yaml" bash "$ROOT/webhooks/admission/deploy/entrypoint.sh" apply >/dev/null
grep -q 'replicaCount: 3' "$TEMP/admission-values.yaml"
grep -q 'upgrade --install admission-webhook' "$TEMP/calls"

rm -f "$TEMP/release"
: > "$TEMP/calls"
USER_VALUES_FILE="$TEMP/stargz-values.yaml" bash "$ROOT/webhooks/stargz/deploy/entrypoint.sh" apply >/dev/null
grep -q 'replicaCount: 2' "$TEMP/stargz-values.yaml"
if grep -Eq 'kubectl delete runtimeclass|kubectl delete .*runtimeclass' "$TEMP/calls"; then
  echo 'RuntimeClass must not be deleted by the stargz entrypoint' >&2
  exit 1
fi
grep -q 'upgrade --install stargz-webhook' "$TEMP/calls"

echo 'PASS: charts, entrypoint syntax, persistent defaults, upgrades and RuntimeClass retention'
