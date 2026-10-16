#!/usr/bin/env bash
# Actual Helm rendering + deterministic API/Helm lifecycle fault injection.
# Requires Helm 3, mikefarah/yq v4, jq and openssl. No cluster is contacted.
set -euo pipefail
trap 'echo "Lifecycle assertion failed at line $LINENO" >&2' ERR
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
  expected_image="ghcr.io/labring/sealos/${module}-webhook:latest"
  grep -Fxq "image: $expected_image" "$chart/values.yaml"
  ignore_file="$ROOT/webhooks/$module/deploy/.sealignore"
  if [[ -f "$ignore_file" ]]; then
    if grep -Fxq "$expected_image" "$ignore_file" || grep -Eq '^\*|(^|/)(manifests|manifest\.yaml|.*\.(md|sh))$' "$ignore_file"; then
      echo 'sealignore must not exclude the application image or contain file patterns' >&2
      exit 1
    fi
  fi
  yq -o=json '.' "$chart/$module-webhook-values.yaml" | jq -e '. == {}' >/dev/null
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
  jq -n --arg name "$1" --arg cert "$TEST_CA" '{apiVersion:"v1",kind:"Secret",metadata:{name:$name,namespace:"sealos-system",uid:("mock-secret-"+$name)},data:{"ca.crt":$cert,"tls.crt":$cert}}' > "$TEST_STATE/objects/Secret.sealos-system.$1.json"
}
entry() { bash "$ROOT/webhooks/$MODULE/deploy/entrypoint.sh" "$@" > "$TEST_STATE/output" 2>&1 || { cat "$TEST_STATE/output" >&2; return 1; }; }
expect_failure() { if entry "$@"; then echo "unexpected success: $*" >&2; exit 1; fi; }

for MODULE in admission stargz; do
  printf 'RUN: %s fresh lifecycle\n' "$MODULE"
  new_state "fresh-$MODULE"
  printf 'global:\n  featureConfigs:\n    %s:\n      replicaCount: 2\n' "$MODULE" > "$GLOBAL_VALUES_FILE"
  if [[ $MODULE == admission ]]; then secret admission-webhook-server-cert; else secret stargz-runtime-injector-tls; fi
  entry help
  entry apply
  jq -se 'any(.[]; .kind=="Deployment" and .spec.replicas==2)' "$TEST_STATE"/objects/*.json >/dev/null
  yq -o=json '.' "$USER_VALUES_FILE" | jq -e '. == {}' >/dev/null
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
  # Simulate a historical stored CA after certificate rotation. Cainjector is
  # paused during restore: correctness must come from the rollback itself.
  yq -o=json -I=0 '.' "$TEST_STATE/revision.2.yaml" | jq '
    if .kind=="MutatingWebhookConfiguration" or .kind=="ValidatingWebhookConfiguration" then
      .webhooks |= map(.clientConfig.caBundle="b2Jzb2xldGU=") else . end
  ' | yq -p=json -P > "$TEST_STATE/historical.yaml"
  mv "$TEST_STATE/historical.yaml" "$TEST_STATE/revision.2.yaml"
  TEST_INJECT_CA=false entry rollback 2
  yq -o=json -I=0 '.' "$TEST_STATE/revision.5.yaml" | jq -se --arg ca "$TEST_CA" '
    any(.[]; .kind=="MutatingWebhookConfiguration" and (.webhooks|length)>0) and
    all(.[] | select(.kind=="MutatingWebhookConfiguration" or .kind=="ValidatingWebhookConfiguration"); all(.webhooks[]; .clientConfig.caBundle==$ca))
  ' >/dev/null
  # Fail a backend rollout; rules must remain at their previous revision.
  yq -o=json -I=0 '.' "$TEST_STATE/revision.5.yaml" | jq '
    if .kind=="MutatingWebhookConfiguration" or .kind=="ValidatingWebhookConfiguration" then
      .webhooks |= map(.clientConfig.caBundle="b2Jzb2xldGU=") else . end
  ' | yq -p=json -P > "$TEST_STATE/historical.yaml"
  mv "$TEST_STATE/historical.yaml" "$TEST_STATE/revision.5.yaml"
  export TEST_FAIL_PHASE=backend TEST_INJECT_CA=false
  expect_failure apply
  grep -q 'injected Helm failure' "$TEST_STATE/output"
  yq -o=json -I=0 '.' "$TEST_STATE/revision.6.yaml" | jq -se --arg ca "$TEST_CA" '
    any(.[]; .kind=="MutatingWebhookConfiguration" and (.webhooks|length)>0) and
    all(.[] | select(.kind=="MutatingWebhookConfiguration" or .kind=="ValidatingWebhookConfiguration"); all(.webhooks[]; .clientConfig.caBundle==$ca))
  ' >/dev/null
  unset TEST_FAIL_PHASE TEST_INJECT_CA
  printf 'PASS: %s fresh install, persisted values, repeated upgrade, rollback and failure\n' "$MODULE"
 done

# Render the old admission Sealos template independently of the new chart.
for creator in false true; do
awk -v creator="$creator" '
  /{{ if .resourceCreatorWebhookEnabled }}/ {skip=(creator=="false"); next}
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
  -e 's/{{ .namespaceWebhookFailurePolicy }}/Fail/g' > "$TEMP/admission-$creator.yaml"
done
cp "$TEMP/admission-false.yaml" "$TEMP/admission-legacy.yaml"
# Preserve Secret references and creator policies from a customized deployment.
yq -o=json -I=0 '.' "$TEMP/admission-true.yaml" | jq '
  if .kind=="Deployment" then
    (.spec.template.spec.containers[] | select(.name=="manager") | .env[] | select(.name=="ICP_KEY")) |=
      (del(.value) | .valueFrom.secretKeyRef={name:"legacy-icp",key:"token"})
  elif .kind=="MutatingWebhookConfiguration" or .kind=="ValidatingWebhookConfiguration" then
    .webhooks |= map(if (.name|contains("resource-creator")) then .failurePolicy="Ignore" else . end)
  else . end
' | yq -p=json -P > "$TEMP/admission-creator.yaml"
for layout in admission admission-creator stargz-script stargz-kustomize; do
  MODULE=stargz
  [[ $layout != admission* ]] || MODULE=admission
  new_state "legacy-$layout"
  case "$layout" in
    admission) fixture="$TEMP/admission-legacy.yaml"; secret admission-webhook-server-cert;;
    admission-creator) fixture="$TEMP/admission-creator.yaml"; secret admission-webhook-server-cert;;
    stargz-script) fixture="$TESTS/fixtures/stargz-script.yaml"; secret stargz-runtime-injector-tls;;
    stargz-kustomize)
      fixture="$TEMP/stargz-kustomize.yaml"
      sed 's/<REGISTRY_URL>/registry.test:5000/g' "$ROOT/webhooks/stargz/deploy/manifest.yaml" > "$fixture"
      secret webhook-server-cert;;
  esac
  kubectl apply -f - < "$fixture"
  if [[ $MODULE == stargz ]]; then
    kubectl get RuntimeClass stargz -o json | jq '
      .scheduling={nodeSelector:{"custom.example.com/stargz":"ready"},tolerations:[{key:"stargz",operator:"Exists"}]}
    ' | kubectl apply -f -
  fi
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
  if [[ $layout == admission-creator ]]; then
    kubectl -n sealos-system get deployment admission-controller-manager -o json | jq -e '
      any(.spec.template.spec.containers[] | select(.name=="manager") | .env[]; .name=="ICP_KEY" and .valueFrom.secretKeyRef=={name:"legacy-icp",key:"token"})
    ' >/dev/null
    kubectl get MutatingWebhookConfiguration admission-mutating-webhook-configuration -o json | jq -e '
      any(.webhooks[]; .name=="mutate-resource-creator.sealos.io" and .failurePolicy=="Ignore")
    ' >/dev/null
  fi
  if [[ $MODULE == stargz ]]; then
    kubectl get RuntimeClass stargz -o json | jq -e '
      .scheduling.nodeSelector=={"custom.example.com/stargz":"ready"} and
      .scheduling.tolerations==[{key:"stargz",operator:"Exists"}]
    ' >/dev/null
  fi
  expect_failure migrate
  # Changing the release's resource names is rejected before another Helm write.
  if [[ $MODULE == stargz ]]; then
    expect_failure apply --set deploymentName=renamed
    expect_failure apply --set service.name=renamed
  else expect_failure apply --set service.webhookName=renamed; fi
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
export TEST_FAIL_LIST=true
expect_failure recover "$backup"
grep -q 'cannot inspect Helm releases safely' "$TEST_STATE/output"
unset TEST_FAIL_LIST
kubectl -n sealos-system get deployment pod-stargz-runtime-injector -o json > "$TEST_STATE/original-deployment.json"
jq '.metadata.uid="replacement"' "$TEST_STATE/original-deployment.json" | kubectl apply -f -
expect_failure recover "$backup"
grep -q 'resource identity changed' "$TEST_STATE/output"
kubectl apply -f - < "$TEST_STATE/original-deployment.json"
# Helm rewrites descriptions for both failed and interrupted installations.
[[ $(jq -r '.[0].status' "$TEST_STATE/history.json") == failed ]]
for status in failed pending-install; do
  jq --arg status "$status" '.[0].status=$status | .[0].description="Initializing release"' "$TEST_STATE/history.json" > "$TEST_STATE/history.tmp"
  mv "$TEST_STATE/history.tmp" "$TEST_STATE/history.json"
  cp "$TEST_STATE/values.1.json" "$TEST_STATE/saved-values.json"
  printf '{}\n' > "$TEST_STATE/values.1.json"
  expect_failure recover "$backup"
  grep -q 'adoption marker' "$TEST_STATE/output"
  cp "$TEST_STATE/saved-values.json" "$TEST_STATE/values.1.json"
done
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

for drift in entry selector validating; do
  MODULE=admission
  new_state "custom-$drift"
  secret admission-webhook-server-cert
  kubectl apply -f - < "$TEMP/admission-legacy.yaml"
  if [[ $drift == validating ]]; then
    kind=ValidatingWebhookConfiguration
    name=admission-validating-webhook-configuration
    filter='.webhooks |= map(select(.name!="vnamespace.sealos.io"))'
  else
    kind=MutatingWebhookConfiguration
    name=admission-mutating-webhook-configuration
    filter='.webhooks[0].namespaceSelector={matchLabels:{custom:"true"}}'
    [[ $drift != entry ]] || filter='.webhooks += [(.webhooks[0] | .name="custom.sealos.io")]'
  fi
  kubectl get "$kind" "$name" -o json | jq "$filter" | kubectl apply -f -
  expect_failure migrate
  grep -q 'unsupported legacy webhook' "$TEST_STATE/output"
  [[ ! -f "$TEST_STATE/history.json" ]]
done
printf 'PASS: unsupported entries, selectors and asymmetric rules rejected before adoption\n'

# Verify source wrappers and packaged wrappers resolve the shared library alike.
mkdir -p "$TEMP/package"
cp -R "$ROOT/webhooks/admission/deploy/charts" "$TEMP/package/charts"
cp "$ROOT/webhooks/admission/deploy/entrypoint.sh" "$ROOT/webhooks/deploy/helm-webhook.sh" "$ROOT/webhooks/deploy/post-renderer.sh" "$TEMP/package/"
bash "$TEMP/package/entrypoint.sh" --help | grep -q migrate
printf 'PASS: packaged entrypoint resolves its bundled library\n'
