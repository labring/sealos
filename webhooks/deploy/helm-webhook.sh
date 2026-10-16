#!/usr/bin/env bash
# Shared by the two entrypoints; also copied into each Sealos cluster image.
set -euo pipefail
umask 077

fail() { echo "error: $*" >&2; exit 1; }
usage() {
  cat <<USAGE
Usage: entrypoint.sh [apply|migrate|rollback REVISION|recover BACKUP_DIRECTORY]

apply     Install or upgrade. Existing non-Helm resources require migrate first.
migrate   Back up and adopt an existing deployment, then perform a staged upgrade.
rollback  Restore a Helm revision, registering its rules before rolling back.
recover   Restore an interrupted first adoption from its recorded backup.

Configuration: USER_VALUES_FILE, GLOBAL_VALUES_FILE, RELEASE_NAMESPACE,
RELEASE_NAME, CHART_PATH, HELM_TIMEOUT (default 5m). Positional arguments after
apply/migrate are forwarded as Helm values options (-f, --set, --set-string,
--set-json, --set-file). Do not use helm uninstall to recover adopted resources.
USAGE
}

main() {
  local action=${1:-apply}
  [[ $# == 0 ]] || shift
  case "$action" in help|-h|--help) usage; return;; esac
  for cmd in helm kubectl jq yq openssl; do
    command -v "$cmd" >/dev/null 2>&1 || fail "missing required command: $cmd"
  done
  helm version --short | grep -q '^v3\.' || fail 'Helm 3 is required (CI verifies 3.19.0)'
  yq --version | grep -q 'version v4\.' || fail 'mikefarah/yq v4 is required'
  RELEASE_NAME=${RELEASE_NAME:-"${MODULE}-webhook"}
  RELEASE_NAMESPACE=${RELEASE_NAMESPACE:-sealos-system}
  CHART_PATH=${CHART_PATH:-"${SCRIPT_DIR}/charts/${MODULE}-webhook"}
  USER_VALUES_FILE=${USER_VALUES_FILE:-"/root/.sealos/cloud/values/core/${MODULE}-webhook-values.yaml"}
  GLOBAL_VALUES_FILE=${GLOBAL_VALUES_FILE:-/root/.sealos/cloud/values/global.yaml}
  HELM_TIMEOUT=${HELM_TIMEOUT:-5m}
  POST_RENDERER=${SCRIPT_DIR}/post-renderer.sh
  [[ -x "$POST_RENDERER" ]] || POST_RENDERER=${SCRIPT_DIR}/../../deploy/post-renderer.sh
  [[ -x "$POST_RENDERER" ]] || fail "post-renderer not found: $POST_RENDERER"
  [[ -f "$CHART_PATH/Chart.yaml" ]] || fail "chart not found: $CHART_PATH"
  STATE_DIR="$(dirname "$USER_VALUES_FILE")/${MODULE}-webhook-state"
  MIGRATION_VALUES="${STATE_DIR}/legacy-values.yaml"
  mkdir -p "$STATE_DIR"
  # mkdir is an atomic lock across entrypoint processes, including migrations.
  mkdir "${STATE_DIR}/lock" 2>/dev/null || fail "another operation is running: ${STATE_DIR}/lock"
  WORK_DIR=$(mktemp -d "${STATE_DIR}/operation.XXXXXX")
  trap 'rm -rf "$WORK_DIR"; rmdir "${STATE_DIR}/lock"' EXIT
  case "$action" in
    recover) [[ $# == 1 ]] || fail 'recover requires one backup directory'; recover "$1"; return;;
    rollback) [[ $# == 1 && $1 =~ ^[1-9][0-9]*$ ]] || fail 'rollback requires a positive revision'; rollback "$1"; return;;
    apply|migrate) ;;
    *) usage; fail "unknown action: $action";;
  esac
  # Only values flags are accepted: lifecycle/ownership flags would bypass the
  # ordering and recovery guarantees of this entrypoint.
  EXTRA_VALUES=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -f|--values|--set|--set-string|--set-json|--set-file)
        [[ $# -ge 2 ]] || fail "missing value for $1"; EXTRA_VALUES+=("$1" "$2"); shift 2;;
      *) fail "unsupported option: $1 (use values options only)";;
    esac
  done
  kubectl get crd certificates.cert-manager.io issuers.cert-manager.io >/dev/null
  kubectl get namespace "$RELEASE_NAMESPACE" >/dev/null 2>&1 ||
    kubectl create namespace "$RELEASE_NAMESPACE"
  init_values
  if [[ "$action" == migrate ]]; then migrate; fi
  apply
}

init_values() {
  # Bootstrap overrides are deliberately small. Never copy the entire defaults
  # file: doing that would pin old images and future chart defaults forever.
  if [[ ! -f "$USER_VALUES_FILE" ]]; then
    if [[ -f "$CHART_PATH/${MODULE}-webhook-values.yaml" ]]; then
      cp "$CHART_PATH/${MODULE}-webhook-values.yaml" "$WORK_DIR/new-values.yaml"
    else printf '{}\n' > "$WORK_DIR/new-values.yaml"; fi
    # Hard link is atomic and cannot overwrite a file created concurrently.
    ln "$WORK_DIR/new-values.yaml" "$USER_VALUES_FILE"
  fi
  VALUES=()
  if [[ -f "$GLOBAL_VALUES_FILE" ]]; then
    # Only this component's config is translated into chart values.
    yq ".global.featureConfigs.${MODULE} // {}" \
      "$GLOBAL_VALUES_FILE" > "$WORK_DIR/global.yaml"
    VALUES+=(-f "$WORK_DIR/global.yaml")
  fi
  [[ ! -f "$MIGRATION_VALUES" ]] || VALUES+=(-f "$MIGRATION_VALUES")
  VALUES+=(-f "$USER_VALUES_FILE")
  legacy_env > "$WORK_DIR/environment.json"
  VALUES+=(-f "$WORK_DIR/environment.json" ${EXTRA_VALUES[@]+"${EXTRA_VALUES[@]}"})
}

legacy_env() {
  local key target value output='{}'
  if [[ "$MODULE" == admission ]]; then
    for key in cnameDomains cnameCheck denyDomains ingressMutatingAnnotations ingressWebhookEnabled ingressWebhookFailurePolicy namespaceWebhookEnabled namespaceWebhookFailurePolicy resourceCreatorWebhookEnabled icpEnabled icpEndpoint icpKey; do
      if printenv "$key" >/dev/null; then
        value=$(printenv "$key")
        case "$key" in
          cnameCheck|ingressWebhookEnabled|namespaceWebhookEnabled|resourceCreatorWebhookEnabled|icpEnabled)
            [[ "$value" == true || "$value" == false ]] || fail "$key must be true or false"
            output=$(jq --arg key "$key" --argjson val "$value" '.config[$key]=$val' <<< "$output");;
          icpKey) output=$(jq --arg val "$value" '.config.icpKey=$val | .config.icpKeySecretRef.name=""' <<< "$output");;
          *) output=$(jq --arg key "$key" --arg val "$value" '.config[$key]=$val' <<< "$output");;
        esac
      fi
    done
  else
    for key in WEBHOOK_IMAGE INTERNAL_REGISTRIES RUNTIME_CLASS_NAME RUNTIME_HANDLER SKIP_ANNOTATION WEBHOOK_FAILURE_POLICY WEBHOOK_REPLICAS; do
      if printenv "$key" >/dev/null; then
        value=$(printenv "$key")
        case "$key" in
          WEBHOOK_IMAGE) target=image;;
          INTERNAL_REGISTRIES) target=webhook.registries;;
          RUNTIME_CLASS_NAME)
            output=$(jq --arg val "$value" '.webhook.runtimeClass=$val | .runtimeClass.name=$val' <<< "$output"); continue;;
          RUNTIME_HANDLER) target=runtimeClass.handler;;
          SKIP_ANNOTATION) target=webhook.skipAnnotation;;
          WEBHOOK_FAILURE_POLICY) target=webhook.failurePolicy;;
          WEBHOOK_REPLICAS)
            [[ "$value" =~ ^[1-9][0-9]*$ ]] || fail 'WEBHOOK_REPLICAS must be positive'
            output=$(jq --argjson val "$value" '.replicaCount=$val' <<< "$output"); continue;;
        esac
        output=$(jq --arg path "$target" --arg val "$value" 'setpath($path | split("."); $val)' <<< "$output")
      fi
    done
  fi
  printf '%s\n' "$output"
}

render() {
  helm template "$RELEASE_NAME" "$CHART_PATH" -n "$RELEASE_NAMESPACE" "${VALUES[@]}" > "$WORK_DIR/desired.yaml"
  yq -o=json -I=0 '.' "$WORK_DIR/desired.yaml" | jq -s 'map(select(. != null))' > "$WORK_DIR/desired.json"
}

snapshot() {
  local kind name namespace item
  : > "$WORK_DIR/objects.jsonl"
  while IFS=$'\t' read -r kind namespace name; do
    item=$(kubectl get "$kind" "$name" -n "${namespace:-$RELEASE_NAMESPACE}" --ignore-not-found -o json)
    [[ -z "$item" ]] || printf '%s\n' "$item" >> "$WORK_DIR/objects.jsonl"
  done < <(jq -r '.[] | [.kind, (.metadata.namespace // "default"), .metadata.name] | @tsv' "$WORK_DIR/desired.json")
  jq -s '.' "$WORK_DIR/objects.jsonl" > "$WORK_DIR/snapshot.json"
  export WEBHOOK_SNAPSHOT="$WORK_DIR/snapshot.json"
}

check_ownership() {
  jq -e --arg release "$RELEASE_NAME" --arg ns "$RELEASE_NAMESPACE" '
    all(.[]; (.metadata.annotations."meta.helm.sh/release-name" // $release) == $release and
      (.metadata.annotations."meta.helm.sh/release-namespace" // $ns) == $ns)
  ' "$WEBHOOK_SNAPSHOT" >/dev/null || fail 'resources belong to another Helm release'
}

check_identities() {
  # Updating names, selectors, cert references or RuntimeClass.handler in place
  # is not a rolling upgrade; reject it before any resources are patched.
  jq -e --slurpfile live "$WEBHOOK_SNAPSHOT" '
    def id: [.apiVersion,.kind,(.metadata.namespace // ""),.metadata.name];
    def issuer: .spec.issuerRef | .kind //= "Issuer" | .group //= "cert-manager.io";
    all(.[]; . as $d | ($live[0] | map(select(id == ($d|id))) | first) as $l |
      if $l == null then true
      elif .kind == "Deployment" then .spec.selector == $l.spec.selector
      elif .kind == "Service" then .spec.selector == $l.spec.selector
      elif .kind == "Certificate" then .spec.secretName == $l.spec.secretName and issuer == ($l|issuer) and (.spec.dnsNames|sort) == ($l.spec.dnsNames|sort)
      elif .kind == "RuntimeClass" then .handler == $l.handler
      else true end)
  ' "$WORK_DIR/desired.json" >/dev/null || fail 'immutable identity, selector or certificate reference changed'
}

check_release_identities() {
  jq -e --slurpfile previous "$1" '
    def identities: map(select(.kind=="Deployment" or (.kind=="Service" and (.spec.ports|any(.port==443))) or .kind=="RuntimeClass" or .kind=="Certificate" or .kind=="Issuer" or .kind=="MutatingWebhookConfiguration" or .kind=="ValidatingWebhookConfiguration") | [.kind,.metadata.namespace,.metadata.name]) | sort;
    identities == ($previous[0] | identities)
  ' "$WORK_DIR/desired.json" >/dev/null || fail 'resource names changed; keep the release identity fixed'
}

wait_backend() {
  local name
  while read -r name; do
    kubectl -n "$RELEASE_NAMESPACE" wait --for=condition=Ready "certificate/$name" --timeout="$HELM_TIMEOUT" || return 1
  done < <(jq -r '.[] | select(.kind=="Certificate") | .metadata.name' "$WORK_DIR/desired.json")
  while read -r name; do
    kubectl -n "$RELEASE_NAMESPACE" rollout status "deployment/$name" --timeout="$HELM_TIMEOUT" || return 1
  done < <(jq -r '.[] | select(.kind=="Deployment") | .metadata.name' "$WORK_DIR/desired.json")
}

verify_certificate() {
  local cert secret expected service
  cert=$(jq -r '.[] | select(.kind=="Certificate") | .metadata.name' "$WORK_DIR/desired.json")
  secret=$(kubectl -n "$RELEASE_NAMESPACE" get certificate "$cert" -o jsonpath='{.spec.secretName}')
  expected=$(kubectl -n "$RELEASE_NAMESPACE" get secret "$secret" -o jsonpath='{.data.ca\.crt}')
  [[ -n "$expected" ]] || { echo "certificate Secret/$secret has no ca.crt" >&2; return 1; }
  kubectl -n "$RELEASE_NAMESPACE" get secret "$secret" -o json > "$WORK_DIR/tls-secret.json" || return 1
  jq -r '.data["ca.crt"]' "$WORK_DIR/tls-secret.json" | openssl base64 -d -A > "$WORK_DIR/ca.crt" || return 1
  jq -r '.data["tls.crt"]' "$WORK_DIR/tls-secret.json" | openssl base64 -d -A > "$WORK_DIR/tls.crt" || return 1
  openssl x509 -in "$WORK_DIR/tls.crt" -noout -checkend 0 >/dev/null || return 1
  service=$(jq -r '.[] | select(.kind=="Service" and (.spec.ports|any(.port==443))) | .metadata.name' "$WORK_DIR/desired.json")
  openssl verify -CAfile "$WORK_DIR/ca.crt" -verify_hostname "$service.$RELEASE_NAMESPACE.svc" "$WORK_DIR/tls.crt" >/dev/null || return 1
  printf '%s\n' "$expected" > "$WORK_DIR/expected-ca"
}

wait_ca() {
  local kind name expected actual attempt
  verify_certificate || return 1
  expected=$(cat "$WORK_DIR/expected-ca")
  while IFS=$'\t' read -r kind name; do
    for ((attempt=0; attempt<60; attempt++)); do
      actual=$(kubectl get "$kind" "$name" -o json) || return 1
      if jq -e --arg ca "$expected" 'all(.webhooks[]?; .clientConfig.caBundle==$ca)' <<< "$actual" >/dev/null; then break; fi
      sleep 2
    done
    [[ "$attempt" -lt 60 ]] || { echo "CA injection timed out: $kind/$name" >&2; return 1; }
  done < <(jq -r '.[] | select(.kind=="MutatingWebhookConfiguration" or .kind=="ValidatingWebhookConfiguration") | [.kind,.metadata.name] | @tsv' "$WORK_DIR/desired.json")
}

apply() {
  local installed=false revision
  render
  snapshot
  check_ownership
  helm list -n "$RELEASE_NAMESPACE" --all -o json > "$WORK_DIR/releases.json"
  if jq -e --arg name "$RELEASE_NAME" 'any(.[]; .name==$name)' "$WORK_DIR/releases.json" >/dev/null; then installed=true; fi
  if [[ "$installed" == false && $(jq length "$WEBHOOK_SNAPSHOT") != 0 ]]; then
    fail 'existing resources found; run entrypoint.sh migrate first'
  fi
  check_identities
  if [[ "$installed" == true ]]; then
    revision=$(helm history "$RELEASE_NAME" -n "$RELEASE_NAMESPACE" -o json | jq -r '[.[] | select(.status=="deployed")][-1].revision')
    [[ "$revision" != null ]] || fail 'release has no deployed revision; inspect the failed install before retrying'
    helm get manifest "$RELEASE_NAME" -n "$RELEASE_NAMESPACE" --revision "$revision" > "$WORK_DIR/previous.yaml"
    yq -o=json -I=0 '.' "$WORK_DIR/previous.yaml" | jq -s 'map(select(. != null))' > "$WORK_DIR/previous.json"
    check_release_identities "$WORK_DIR/previous.json"
  fi
  export WEBHOOK_RENDER_MODE=backend
  # Both revisions retain Helm ownership of the same registrations. The first
  # revision keeps their live contents while the complete backend rolls out.
  if ! helm upgrade --install "$RELEASE_NAME" "$CHART_PATH" -n "$RELEASE_NAMESPACE" \
    --reset-values "${VALUES[@]}" --post-renderer "$POST_RENDERER" --wait --timeout "$HELM_TIMEOUT"; then
    if [[ "$installed" == true ]]; then rollback "$revision"; fi
    echo 'Backend upgrade failed; inspect helm status before retrying.' >&2
    return 1
  fi
  if ! wait_backend; then
    [[ "$installed" != true ]] || rollback "$revision"
    return 1
  fi
  if ! verify_certificate; then
    [[ "$installed" != true ]] || rollback "$revision"
    echo 'Serving certificate verification failed before enabling new registrations.' >&2
    return 1
  fi
  local backend_revision
  backend_revision=$(helm history "$RELEASE_NAME" -n "$RELEASE_NAMESPACE" -o json | jq -r '.[-1].revision')
  # Rendered chart identities remain stable; cert-manager owns caBundle fields.
  if ! helm upgrade "$RELEASE_NAME" "$CHART_PATH" -n "$RELEASE_NAMESPACE" \
    --reset-values "${VALUES[@]}" --wait --timeout "$HELM_TIMEOUT"; then
    rollback "$backend_revision"
    return 1
  fi
  if ! wait_ca; then
    rollback "$backend_revision"
    echo 'CA verification failed; restored the backend revision and its previous registrations.' >&2
    return 1
  fi
  echo "${MODULE} webhook upgraded. User values: $USER_VALUES_FILE"
}

migrate() {
  local deployment count backup kind name namespace
  helm list -n "$RELEASE_NAMESPACE" --all -o json > "$WORK_DIR/releases.json"
  if jq -e --arg name "$RELEASE_NAME" 'any(.[]; .name==$name)' "$WORK_DIR/releases.json" >/dev/null; then fail 'release already exists; use apply'; fi
  # Distinguish both historical stargz layouts rather than changing selectors.
  if [[ "$MODULE" == stargz ]]; then
    count=0
    for name in pod-stargz-runtime-injector pod-stargz-runtime-injector-controller-manager; do
      if [[ -n $(kubectl -n "$RELEASE_NAMESPACE" get deployment "$name" --ignore-not-found -o name) ]]; then deployment=$name; count=$((count+1)); fi
    done
    [[ "$count" == 1 ]] || fail 'expected exactly one known stargz deployment; resolve custom/duplicate layouts first'
    kubectl -n "$RELEASE_NAMESPACE" get deployment "$deployment" -o json > "$WORK_DIR/deployment.json"
    if [[ "$deployment" == *-controller-manager ]]; then
      cat > "$WORK_DIR/layout.yaml" <<LAYOUT
 deploymentName: pod-stargz-runtime-injector-controller-manager
 selectorLabels:
   app.kubernetes.io/name: stargz-runtime-injector
   control-plane: controller-manager
 serviceAccount:
   name: pod-stargz-runtime-injector-controller-manager
 service:
   name: pod-stargz-runtime-injector-webhook-service
 certificate:
   name: pod-stargz-runtime-injector-serving-cert
   issuerName: pod-stargz-runtime-injector-selfsigned-issuer
   secretName: webhook-server-cert
 webhook:
   name: pod-stargz-runtime-injector-mutating-webhook-configuration
   entryName: pod-stargz-runtime-injector.sealos.io
LAYOUT
      VALUES=(-f "$WORK_DIR/layout.yaml" "${VALUES[@]}")
    fi
  else
    kubectl -n "$RELEASE_NAMESPACE" get deployment admission-controller-manager -o json > "$WORK_DIR/deployment.json"
  fi
  render
  snapshot
  local service_name
  service_name=$(jq -r '.[] | select(.kind=="Service" and (.spec.ports | any(.port==443))) | .metadata.name' "$WORK_DIR/desired.json")
  kubectl get mutatingwebhookconfigurations,validatingwebhookconfigurations -o json > "$WORK_DIR/all-registrations.json"
  jq -e --arg ns "$RELEASE_NAMESPACE" --arg service "$service_name" --slurpfile desired "$WORK_DIR/desired.json" '
    all(.items[] | select(any(.webhooks[]?; .clientConfig.service.namespace==$ns and .clientConfig.service.name==$service));
      . as $live | any($desired[0][]; .kind==$live.kind and .metadata.name==$live.metadata.name))
  ' "$WORK_DIR/all-registrations.json" >/dev/null || fail 'duplicate/custom admission registrations found; resolve them before migrating'
  jq -e --arg module "$MODULE" '
    any(.[]; .kind=="Deployment") and any(.[]; .kind=="Certificate") and any(.[]; .kind=="Issuer") and any(.[]; .kind=="Service" and (.spec.ports|any(.port==443))) and any(.[]; .kind=="MutatingWebhookConfiguration") and
    (if $module=="admission" then any(.[]; .kind=="ValidatingWebhookConfiguration") else true end)
  ' "$WEBHOOK_SNAPSHOT" >/dev/null || fail 'legacy installation is incomplete or uses custom resource names'
  [[ $(jq length "$WEBHOOK_SNAPSHOT") -gt 0 ]] || fail 'no legacy resources found'
  check_ownership
  # Save live business settings without pinning the old image. The baseline
  # post-renderer keeps the old image only in Helm revision 1.
  legacy_values > "$WORK_DIR/legacy-values.json"
  [[ ! -f "$WORK_DIR/layout.yaml" ]] || yq -o=json "$WORK_DIR/layout.yaml" > "$WORK_DIR/layout.json"
  [[ -f "$WORK_DIR/layout.json" ]] || printf '{}\n' > "$WORK_DIR/layout.json"
  jq '[.[] | select(.kind=="Certificate")][0] as $cert |
      [.[] | select(.kind=="Issuer")][0] as $issuer |
      {certificate:{spec:$cert.spec,issuerSpec:$issuer.spec}}' "$WEBHOOK_SNAPSHOT" > "$WORK_DIR/certificate.json"
  jq -s '.[0] * .[1] * .[2]' "$WORK_DIR/layout.json" "$WORK_DIR/legacy-values.json" "$WORK_DIR/certificate.json" > "$WORK_DIR/migration.json"
  check_legacy_registrations
  backup="${STATE_DIR}/backup-$(date -u +%Y%m%dT%H%M%SZ)"
  mkdir "$backup"
  cp "$WEBHOOK_SNAPSHOT" "$backup/resources.json"
  cp "$USER_VALUES_FILE" "$backup/user-values.yaml"
  local tls_secret
  tls_secret=$(jq -r '.[] | select(.kind=="Certificate") | .spec.secretName' "$WEBHOOK_SNAPSHOT")
  [[ -z "$tls_secret" ]] || kubectl -n "$RELEASE_NAMESPACE" get secret "$tls_secret" -o json > "$backup/tls-secret.json"
  printf '%s\n' "$RELEASE_NAME" > "$backup/release-name"
  printf '%s\n' "$RELEASE_NAMESPACE" > "$backup/namespace"
  # Snapshot contains potentially sensitive env values; umask above is 077.
  echo "Legacy backup: $backup"
  cp "$WORK_DIR/migration.json" "$MIGRATION_VALUES"
  init_values
  render
  # Re-snapshot after layout values have been persisted.
  snapshot
  check_ownership
  check_identities
  while IFS=$'\t' read -r kind namespace name; do
    kubectl -n "${namespace:-$RELEASE_NAMESPACE}" label "$kind" "$name" app.kubernetes.io/managed-by=Helm --overwrite
    kubectl -n "${namespace:-$RELEASE_NAMESPACE}" annotate "$kind" "$name" \
      "meta.helm.sh/release-name=$RELEASE_NAME" "meta.helm.sh/release-namespace=$RELEASE_NAMESPACE" --overwrite
  done < <(jq -r '.[] | [.kind,(.metadata.namespace // "default"),.metadata.name] | @tsv' "$WEBHOOK_SNAPSHOT")
  export WEBHOOK_RENDER_MODE=baseline
  if ! helm install "$RELEASE_NAME" "$CHART_PATH" -n "$RELEASE_NAMESPACE" "${VALUES[@]}" \
    --description "Legacy adoption: $(basename "$backup")" \
    --set-string "_sealosMigrationBackup=$(basename "$backup")" --post-renderer "$POST_RENDERER" --wait --timeout "$HELM_TIMEOUT"; then
    echo "Adoption failed. Recover with: entrypoint.sh recover $backup" >&2
    return 1
  fi
}

check_legacy_registrations() {
  # Compare the supported legacy settings independently of operator overrides.
  # A migration must not silently discard unknown entries, selectors or rules.
  helm template "$RELEASE_NAME" "$CHART_PATH" -n "$RELEASE_NAMESPACE" \
    -f "$WORK_DIR/migration.json" > "$WORK_DIR/legacy-render.yaml"
  yq -o=json -I=0 '.' "$WORK_DIR/legacy-render.yaml" | jq -s 'map(select(. != null))' > "$WORK_DIR/legacy-render.json"
  jq -e --slurpfile expected "$WORK_DIR/legacy-render.json" '
    def registrations:
      map(select(.kind=="MutatingWebhookConfiguration" or .kind=="ValidatingWebhookConfiguration") |
        .kind as $kind | {kind:.kind,name:.metadata.name,webhooks:((.webhooks // []) | map(
          del(.clientConfig.caBundle) |
          .clientConfig.service.port //= 443 |
          .matchPolicy //= "Equivalent" | .failurePolicy //= "Fail" |
          .namespaceSelector //= {} | .objectSelector //= {} |
          .timeoutSeconds //= 10 | .matchConditions //= [] |
          if $kind=="MutatingWebhookConfiguration" then .reinvocationPolicy //= "Never" else . end |
          .rules |= map(.scope //= "*")
        ) | sort_by(.name))}) | sort_by(.kind,.name);
    registrations == ($expected[0] | registrations)
  ' "$WEBHOOK_SNAPSHOT" >/dev/null || fail 'unsupported legacy webhook entries or policies; reconcile them before migrating'
}

legacy_values() {
  local live="$WORK_DIR/deployment.json"
  if [[ "$MODULE" == admission ]]; then
    jq '
      def arg($key;$default): [.spec.template.spec.containers[] | select(.name=="manager") | .args[]? | select(startswith("--"+$key+"=")) | ltrimstr("--"+$key+"=")][0] // $default;
      def env($key;$default): [.spec.template.spec.containers[] | select(.name=="manager") | .env[]? | select(.name==$key) | .value][0] // $default;
      def envref($key): [.spec.template.spec.containers[] | select(.name=="manager") | .env[]? | select(.name==$key) | .valueFrom.secretKeyRef][0];
      {replicaCount: .spec.replicas, config: {
        cnameDomains: arg("cnameDomains";"cloud.sealos.io,laf.dev,laf.run"),
        cnameCheck: (arg("cnameCheck";"true") | fromjson),
        denyDomains: arg("denyDomains";""), ingressMutatingAnnotations: arg("ingress-mutating-annotations";""),
        icpEnabled: (env("ICP_ENABLED";"false") | fromjson), icpEndpoint: env("ICP_ENDPOINT";""), icpKey: env("ICP_KEY";""),
        icpKeySecretRef: (envref("ICP_KEY") // {name:"",key:"ICP_KEY"})}}
    ' "$live" > "$WORK_DIR/legacy-config.json"
    jq --slurpfile config "$WORK_DIR/legacy-config.json" '
      [.[] | select(.kind=="MutatingWebhookConfiguration") | .webhooks[]?] as $rules |
      $config[0] | .config.ingressWebhookEnabled=any($rules[]; .name=="mingress.sealos.io") |
      .config.namespaceWebhookEnabled=any($rules[]; .name=="mnamespace.sealos.io") |
      .config.resourceCreatorWebhookEnabled=any($rules[]; .name=="mutate-resource-creator.sealos.io") |
      .config.resourceCreatorWebhookFailurePolicy=([$rules[] | select(.name=="mutate-resource-creator.sealos.io") | .failurePolicy][0] // "Fail") |
      .config.ingressWebhookFailurePolicy=([$rules[] | select(.name=="mingress.sealos.io") | .failurePolicy][0] // "Fail") |
      .config.namespaceWebhookFailurePolicy=([$rules[] | select(.name=="mnamespace.sealos.io") | .failurePolicy][0] // "Fail")
    ' "$WEBHOOK_SNAPSHOT"
  else
    jq '
      def arg($key;$default): [.spec.template.spec.containers[] | .args[]? | select(startswith("--"+$key+"=")) | ltrimstr("--"+$key+"=")][0] // $default;
      {replicaCount: .spec.replicas, webhook: {registries: arg("registries";"sealos.hub:5000"), runtimeClass: arg("runtime-class";"stargz"), skipAnnotation: arg("skip-annotation";"stargz.sealos.io/skip")}}
    ' "$live" > "$WORK_DIR/legacy-config.json"
    jq --slurpfile config "$WORK_DIR/legacy-config.json" '
      [.[] | select(.kind=="MutatingWebhookConfiguration") | .webhooks[]?][0] as $rule |
      ([.[] | select(.kind=="RuntimeClass")][0]) as $runtime |
      $config[0] | .webhook.failurePolicy=($rule.failurePolicy // "Ignore") | .webhook.entryName=$rule.name |
      if $runtime != null then
        .runtimeClass.scheduling=($runtime.scheduling // {}) | .runtimeClass.handler=$runtime.handler
      else . end
    ' "$WEBHOOK_SNAPSHOT"
  fi
}

rollback() {
  local revision=$1
  helm get manifest "$RELEASE_NAME" -n "$RELEASE_NAMESPACE" --revision "$revision" > "$WORK_DIR/target.yaml" || return 1
  yq -o=json -I=0 '.' "$WORK_DIR/target.yaml" | jq -s 'map(select(. != null))' > "$WORK_DIR/desired.json"
  helm get manifest "$RELEASE_NAME" -n "$RELEASE_NAMESPACE" > "$WORK_DIR/current.yaml" || return 1
  yq -o=json -I=0 '.' "$WORK_DIR/current.yaml" | jq -s 'map(select(. != null))' > "$WORK_DIR/current.json"
  check_release_identities "$WORK_DIR/current.json"
  snapshot
  check_ownership
  check_identities
  verify_certificate || return 1
  # A historical manifest may contain a CA that cert-manager has since rotated.
  # Restore it as a new Helm revision with the current CA, rather than allowing
  # native Helm rollback to write an obsolete CA during the backend rollout.
  jq --arg ca "$(cat "$WORK_DIR/expected-ca")" '
    map(if .kind=="MutatingWebhookConfiguration" or .kind=="ValidatingWebhookConfiguration" then
      .webhooks |= map(.clientConfig.caBundle=$ca)
    elif .kind=="RuntimeClass" then .metadata.annotations["helm.sh/resource-policy"]="keep"
    else . end)
  ' "$WORK_DIR/desired.json" > "$WORK_DIR/restored.json"
  jq '.[] | select(.kind=="MutatingWebhookConfiguration" or .kind=="ValidatingWebhookConfiguration")' \
    "$WORK_DIR/restored.json" | yq -p=json -P | kubectl apply -f - || return 1
  wait_ca || return 1
  mkdir -p "$WORK_DIR/rollback-chart/templates"
  cat > "$WORK_DIR/rollback-chart/Chart.yaml" <<'CHART'
apiVersion: v2
name: webhook-manifest-restore
version: 0.1.0
description: Restores a historical webhook manifest with the current serving CA
CHART
  jq '.[]' "$WORK_DIR/restored.json" | yq -p=json -P > "$WORK_DIR/rollback-chart/manifest.yaml"
  printf '%s\n' '{{ .Files.Get "manifest.yaml" }}' > "$WORK_DIR/rollback-chart/templates/resources.yaml"
  helm upgrade "$RELEASE_NAME" "$WORK_DIR/rollback-chart" -n "$RELEASE_NAMESPACE" \
    --reset-values --description "Restore webhook revision $revision with current CA" --wait --timeout "$HELM_TIMEOUT" || return 1
  wait_backend || return 1
  wait_ca || return 1
  echo "Restored $RELEASE_NAME revision $revision as a new Helm revision. Update $USER_VALUES_FILE before the next apply."
}

recover() {
  local backup=$1 kind namespace name live expected_uid
  [[ -f "$backup/resources.json" && -f "$backup/release-name" && -f "$backup/namespace" ]] || fail 'not a migration backup directory'
  [[ $(cat "$backup/release-name") == "$RELEASE_NAME" && $(cat "$backup/namespace") == "$RELEASE_NAMESPACE" ]] || fail 'backup release/namespace does not match'
  # Recovery is limited to the first adoption. Never erase an established
  # release history or use uninstall (which would delete adopted resources).
  helm list -n "$RELEASE_NAMESPACE" --all -o json > "$WORK_DIR/releases.json" || fail 'cannot inspect Helm releases safely'
  if jq -e --arg name "$RELEASE_NAME" 'any(.[]; .name==$name)' "$WORK_DIR/releases.json" >/dev/null; then
    helm history "$RELEASE_NAME" -n "$RELEASE_NAMESPACE" -o json > "$WORK_DIR/history.json" || fail 'cannot inspect Helm history safely'
    jq -e 'length==1 and (.[0].revision|tonumber)==1' "$WORK_DIR/history.json" >/dev/null ||
      fail 'release history does not match this first-adoption backup; use rollback'
    # Helm rewrites descriptions on failed/pending installs. Stored user values
    # survive these transitions and bind this revision to its local backup.
    helm get values "$RELEASE_NAME" -n "$RELEASE_NAMESPACE" --revision 1 -o json > "$WORK_DIR/adoption-values.json" || fail 'cannot inspect adoption marker safely'
    jq -e --arg backup "$(basename "$backup")" '._sealosMigrationBackup==$backup' \
      "$WORK_DIR/adoption-values.json" >/dev/null || fail 'adoption marker does not match this backup'
  else
    live=$(kubectl -n "$RELEASE_NAMESPACE" get secret "sh.helm.release.v1.${RELEASE_NAME}.v1" --ignore-not-found -o name) || fail 'cannot inspect Helm bookkeeping safely'
    [[ -z "$live" ]] ||
      fail 'Helm bookkeeping still exists; inspect the interrupted release before recovery'
  fi
  while IFS=$'\t' read -r kind namespace name; do
    live=$(kubectl get "$kind" "$name" -n "${namespace:-$RELEASE_NAMESPACE}" -o json) || fail "backup resource is missing: $kind/$name"
    expected_uid=$(jq -r --arg kind "$kind" --arg name "$name" '.[] | select(.kind==$kind and .metadata.name==$name) | .metadata.uid' "$backup/resources.json")
    [[ -n "$expected_uid" && "$expected_uid" != null && $(jq -r '.metadata.uid' <<< "$live") == "$expected_uid" ]] || fail "resource identity changed: $kind/$name"
    jq -e --arg release "$RELEASE_NAME" --arg ns "$RELEASE_NAMESPACE" '(.metadata.annotations."meta.helm.sh/release-name" // $release)==$release and (.metadata.annotations."meta.helm.sh/release-namespace" // $ns)==$ns' <<< "$live" >/dev/null || fail "resource ownership changed: $kind/$name"
  done < <(jq -r '.[] | [.kind,(.metadata.namespace // "default"),.metadata.name] | @tsv' "$backup/resources.json")
  if [[ -f "$backup/tls-secret.json" ]]; then
    name=$(jq -r '.metadata.name' "$backup/tls-secret.json")
    kubectl -n "$RELEASE_NAMESPACE" get secret "$name" -o json > "$WORK_DIR/recovery-secret.json"
    jq -e --slurpfile saved "$backup/tls-secret.json" '
      .metadata.uid!=null and .metadata.uid==$saved[0].metadata.uid and .data==$saved[0].data
    ' "$WORK_DIR/recovery-secret.json" >/dev/null || fail 'TLS Secret changed since backup; reconcile certificate state before recovery'
  fi
  jq '.[] | del(.status,.metadata.resourceVersion,.metadata.uid,.metadata.generation,.metadata.creationTimestamp,.metadata.managedFields)' "$backup/resources.json" | yq -p=json -P |
    kubectl apply -f -
  if [[ -f "$backup/tls-secret.json" ]]; then
    jq 'del(.metadata.resourceVersion,.metadata.uid,.metadata.creationTimestamp,.metadata.managedFields)' "$backup/tls-secret.json" | kubectl apply -f -
  fi
  # Restore only the Helm ownership keys changed by adoption, including keys
  # which were originally absent. Other controllers keep their own metadata.
  while IFS=$'\t' read -r kind namespace name; do
    jq --arg kind "$kind" --arg name "$name" '
      .[] | select(.kind==$kind and .metadata.name==$name) |
      {metadata:{labels:{"app.kubernetes.io/managed-by":.metadata.labels."app.kubernetes.io/managed-by"},annotations:{"meta.helm.sh/release-name":.metadata.annotations."meta.helm.sh/release-name","meta.helm.sh/release-namespace":.metadata.annotations."meta.helm.sh/release-namespace"}}}
    ' "$backup/resources.json" > "$WORK_DIR/ownership.json"
    kubectl -n "${namespace:-$RELEASE_NAMESPACE}" patch "$kind" "$name" --type=merge --patch-file "$WORK_DIR/ownership.json"
  done < <(jq -r '.[] | [.kind,(.metadata.namespace // "default"),.metadata.name] | @tsv' "$backup/resources.json")
  # Delete the single Helm bookkeeping Secret, never the adopted workloads.
  kubectl -n "$RELEASE_NAMESPACE" delete secret "sh.helm.release.v1.${RELEASE_NAME}.v1" --ignore-not-found
  cp "$backup/user-values.yaml" "$USER_VALUES_FILE"
  rm -f "$MIGRATION_VALUES"
  echo "Restored legacy resources from $backup; stop using Helm until migration is retried."
}

main "$@"
