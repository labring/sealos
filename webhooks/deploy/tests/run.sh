#!/usr/bin/env bash
# Actual Helm rendering + deterministic API/Helm lifecycle fault injection.
# Requires Helm 3, mikefarah/yq v4, jq and openssl. No cluster is contacted.
set -euo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
TESTS="$ROOT/webhooks/deploy/tests"
export REAL_HELM
REAL_HELM=$(command -v helm)
TEMP=$(mktemp -d)
trap 'rm -rf "$TEMP"' EXIT
mkdir "$TEMP/bin"
ln -s "$TESTS/mock-helm.sh" "$TEMP/bin/helm"
ln -s "$TESTS/mock-kubectl.sh" "$TEMP/bin/kubectl"
export PATH="$TEMP/bin:$PATH"

for module in admission stargz; do
  chart="$ROOT/webhooks/$module/deploy/charts/$module-webhook"
  helm lint "$chart"
  helm template "$module-webhook" "$chart" -n sealos-system > "$TEMP/$module.yaml"
  helm package "$chart" -d "$TEMP" >/dev/null
  tar -tzf "$TEMP/$module-webhook-0.1.0.tgz" | grep -q "$module-webhook/templates/deployment.yaml"
  if helm template "$module-webhook" "$chart" --set replicaCount=0 > /dev/null 2>&1; then echo 'invalid replicas accepted' >&2; exit 1; fi
 done
helm template admission-webhook "$ROOT/webhooks/admission/deploy/charts/admission-webhook" \
  --set config.ingressWebhookEnabled=false --set config.namespaceWebhookEnabled=false \
  --set config.resourceCreatorWebhookEnabled=false | yq -o=json -I=0 '.' | \
  jq -se 'map(select(.kind=="MutatingWebhookConfiguration" or .kind=="ValidatingWebhookConfiguration")) | length==2 and all(.[]; .webhooks==[])' > /dev/null
helm template admission-webhook "$ROOT/webhooks/admission/deploy/charts/admission-webhook" \
  --set config.resourceCreatorWebhookEnabled=true --set config.icpKeySecretRef.name=existing-icp | yq -o=json -I=0 '.' | \
  jq -se 'any(.[]; .kind=="Deployment" and any(.spec.template.spec.containers[] | select(.name=="manager") | .env[]; .name=="ICP_KEY" and .valueFrom.secretKeyRef.name=="existing-icp")) and any(.[]; .kind=="MutatingWebhookConfiguration" and any(.webhooks[]; .name=="mutate-resource-creator.sealos.io" and .failurePolicy=="Fail"))' > /dev/null
helm template stargz-webhook "$ROOT/webhooks/stargz/deploy/charts/stargz-webhook" --set metrics.enabled=true | yq -o=json -I=0 '.' | \
  jq -se 'any(.[]; .kind=="Deployment" and any(.spec.template.spec.containers[0].args[]; .=="--metrics-bind-address=:8443"))' >/dev/null
# Assert literal argv rather than accepting shell-looking quotes inside values.
yq -o=json -I=0 '.' "$TEMP/admission.yaml" | jq -se 'any(.[]; .kind=="Deployment" and any(.spec.template.spec.containers[] | select(.name=="manager") | .args[]; .=="--cnameCheck=true"))' > /dev/null
printf 'PASS: charts, schemas, packages, disabled registrations, secret references and argv\n'

# Generate a test-only certificate valid for all fixture Service names.
openssl req -x509 -newkey rsa:2048 -nodes -keyout "$TEMP/tls.key" -out "$TEMP/tls.crt" -days 1 \
  -subj /CN=webhook.test -addext 'subjectAltName=DNS:admission-webhook-service.sealos-system.svc,DNS:pod-stargz-runtime-injector.sealos-system.svc,DNS:pod-stargz-runtime-injector-webhook-service.sealos-system.svc' > /dev/null 2>&1
export TEST_CA
TEST_CA=$(openssl base64 -A -in "$TEMP/tls.crt")
new_state() {
  export TEST_STATE USER_VALUES_FILE GLOBAL_VALUES_FILE
  TEST_STATE="$TEMP/$1"
  mkdir -p "$TEST_STATE/objects"
  USER_VALUES_FILE="$TEST_STATE/config/user.yaml"
  GLOBAL_VALUES_FILE="$TEST_STATE/global.yaml"
  : > "$TEST_STATE/events"
  jq -n '{apiVersion:"v1",kind:"Namespace",metadata:{name:"sealos-system"}}' > "$TEST_STATE/objects/Namespace.default.sealos-system.json"
}
secret() {
  jq -n --arg name "$1" --arg cert "$TEST_CA" '{apiVersion:"v1",kind:"Secret",metadata:{name:$name,namespace:"sealos-system"},data:{"ca.crt":$cert,"tls.crt":$cert}}' > "$TEST_STATE/objects/Secret.sealos-system.$1.json"
}
entry() { bash "$ROOT/webhooks/$MODULE/deploy/entrypoint.sh" "$@" > "$TEST_STATE/output" 2>&1 || { cat "$TEST_STATE/output" >&2; return 1; }; }
expect_failure() { if entry "$@"; then echo "unexpected success: $*" >&2; exit 1; fi; }

for MODULE in admission stargz; do
  printf 'RUN: %s fresh lifecycle\n' "$MODULE"
  new_state "fresh-$MODULE"
  if [[ $MODULE == admission ]]; then secret admission-webhook-server-cert; else secret stargz-runtime-injector-tls; fi
  entry help
  entry apply
  [[ $(jq length "$TEST_STATE/history.json") == 2 ]]
  [[ $(grep -c '^helm:' "$TEST_STATE/events") == 2 ]]
  first=$(grep '^helm:' "$TEST_STATE/events" | head -1)
  [[ $first == helm:backend ]]
  # Initial backend revision contains empty rules, then registration enables them.
  yq -o=json -I=0 '.' "$TEST_STATE/revision.1.yaml" | jq -se 'all(.[] | select(.kind=="MutatingWebhookConfiguration" or .kind=="ValidatingWebhookConfiguration"); .webhooks==[])' >/dev/null
  mkdir -p "$(dirname "$USER_VALUES_FILE")"
  printf 'replicaCount: 3\n' > "$USER_VALUES_FILE"
  before=$(cat "$USER_VALUES_FILE")
  entry apply
  [[ $(cat "$USER_VALUES_FILE") == "$before" ]]
  jq -se 'any(.[]; .kind=="Deployment" and .spec.replicas==3)' "$TEST_STATE"/objects/*.json >/dev/null
  entry rollback 2
  # Fail a backend rollout; rules must remain at their previous revision.
  export TEST_FAIL_PHASE=backend
  expect_failure apply
  grep -q 'injected Helm failure' "$TEST_STATE/output"
  unset TEST_FAIL_PHASE
  printf 'PASS: %s fresh install, persisted values, repeated upgrade, rollback and failure\n' "$MODULE"
 done

# Render the old admission Sealos template independently of the new chart.
awk '
  /{{ if .resourceCreatorWebhookEnabled }}/ {skip=1; next}
  /{{ if/ {next}
  /{{ end }}/ {skip=0; next}
  !skip {print}
' "$ROOT/webhooks/admission/deploy/manifests/deploy.yaml.tmpl" | sed \
  -e 's/{{ .cnameDomains }}/legacy.example.test/g' \
  -e 's/{{ .cnameCheck }}/false/g' \
  -e 's/{{ .denyDomains }}/blocked.example.test/g' \
  -e 's/{{ .ingressMutatingAnnotations }}//g' \
  -e 's/{{ .icpEnabled }}/false/g' \
  -e 's/{{ .icpEndpoint }}//g' \
  -e 's/{{ .icpKey }}//g' \
  -e 's/{{ .ingressWebhookFailurePolicy }}/Fail/g' \
  -e 's/{{ .namespaceWebhookFailurePolicy }}/Fail/g' > "$TEMP/admission-legacy.yaml"
for layout in admission stargz-script stargz-kustomize; do
  MODULE=stargz
  [[ $layout != admission ]] || MODULE=admission
  new_state "legacy-$layout"
  case "$layout" in
    admission) fixture="$TEMP/admission-legacy.yaml"; secret admission-webhook-server-cert;;
    stargz-script) fixture="$TESTS/fixtures/stargz-script.yaml"; secret stargz-runtime-injector-tls;;
    stargz-kustomize)
      fixture="$TEMP/stargz-kustomize.yaml"
      sed 's/<REGISTRY_URL>/registry.test:5000/g' "$ROOT/webhooks/stargz/deploy/manifest.yaml" > "$fixture"
      secret webhook-server-cert;;
  esac
  kubectl apply -f - < "$fixture"
  expect_failure apply
  entry migrate
  [[ $(jq length "$TEST_STATE/history.json") == 3 ]]
  grep -q '^helm:baseline$' "$TEST_STATE/events"
  [[ -f "$(dirname "$USER_VALUES_FILE")/$MODULE-webhook-state/legacy-values.yaml" ]]
  # Baseline must contain the original Deployment spec, including its selector.
  yq -o=json -I=0 '.' "$fixture" | jq -s '[.[] | select(.kind=="Deployment")][0].spec' > "$TEST_STATE/expected.json"
  yq -o=json -I=0 '.' "$TEST_STATE/revision.1.yaml" | jq -s '[.[] | select(.kind=="Deployment")][0].spec' > "$TEST_STATE/actual.json"
  cmp "$TEST_STATE/expected.json" "$TEST_STATE/actual.json"
  if [[ $MODULE == admission ]]; then
    jq -se 'any(.[]; .kind=="Deployment" and any(.spec.template.spec.containers[] | select(.name=="manager") | .args[]; .=="--cnameCheck=false"))' "$TEST_STATE"/objects/*.json >/dev/null
  fi
  entry apply
  expect_failure migrate
  # Changing the release's resource names is rejected before another Helm write.
  if [[ $MODULE == stargz ]]; then expect_failure apply --set deploymentName=renamed; fi
  printf 'PASS: %s migration preserves baseline, selector, certificate and config\n' "$layout"
 done

MODULE=stargz
new_state failed-adoption
secret stargz-runtime-injector-tls
kubectl apply -f - < "$TESTS/fixtures/stargz-script.yaml"
export TEST_FAIL_PHASE=baseline
expect_failure migrate
unset TEST_FAIL_PHASE
backup=$(find "$(dirname "$USER_VALUES_FILE")/stargz-webhook-state" -type d -name 'backup-*')
entry recover "$backup"
jq -e '.metadata.labels."app.kubernetes.io/managed-by"==null and .metadata.annotations."meta.helm.sh/release-name"==null' "$TEST_STATE/objects/Deployment.sealos-system.pod-stargz-runtime-injector.json" >/dev/null
[[ ! -f "$TEST_STATE/release.json" ]]
printf 'PASS: failed adoption recovery restores ownership without uninstalling workloads\n'

new_state foreign-release
secret stargz-runtime-injector-tls
kubectl apply -f - < "$TESTS/fixtures/stargz-script.yaml"
kubectl -n sealos-system annotate deployment pod-stargz-runtime-injector meta.helm.sh/release-name=someone-else
expect_failure migrate
[[ ! -f "$TEST_STATE/history.json" ]]
printf 'PASS: conflicting release ownership is rejected\n'

# Verify source wrappers and packaged wrappers resolve the shared library alike.
mkdir -p "$TEMP/package"
cp -R "$ROOT/webhooks/admission/deploy/charts" "$TEMP/package/charts"
cp "$ROOT/webhooks/admission/deploy/entrypoint.sh" "$ROOT/webhooks/deploy/helm-webhook.sh" "$ROOT/webhooks/deploy/post-renderer.sh" "$TEMP/package/"
bash "$TEMP/package/entrypoint.sh" --help | grep -q migrate
printf 'PASS: packaged entrypoint resolves its bundled library\n'
