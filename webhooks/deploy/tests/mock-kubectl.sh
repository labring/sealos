#!/usr/bin/env bash
set -euo pipefail
args=("$@")
namespace=default
for ((i=0;i<$#;i++)); do
  if [[ ${args[$i]} == -n || ${args[$i]} == --namespace ]]; then namespace=${args[$((i+1))]}; fi
done
# Normalize kubectl's accepted placement of -n before or after the verb.
if [[ $1 == -n ]]; then shift 2; fi
verb=$1; shift
canonical() {
  case "$1" in
    deployment|deployments) echo Deployment;;
    certificate|certificates) echo Certificate;;
    secret|secrets) echo Secret;;
    namespace|namespaces) echo Namespace;;
    mutatingwebhookconfiguration|mutatingwebhookconfigurations) echo MutatingWebhookConfiguration;;
    validatingwebhookconfiguration|validatingwebhookconfigurations) echo ValidatingWebhookConfiguration;;
    *) echo "$1";;
  esac
}
store() {
  local input=$1 kind name ns
  kind=$(jq -r '.kind' <<< "$input"); name=$(jq -r '.metadata.name' <<< "$input"); ns=$(jq -r '.metadata.namespace // "default"' <<< "$input")
  jq --arg ca "$TEST_CA" --arg uid "mock-${kind}-${ns}-${name}" '
    .metadata.uid //= $uid |
    if (.kind=="MutatingWebhookConfiguration" or .kind=="ValidatingWebhookConfiguration") then .webhooks |= map(.clientConfig.caBundle=$ca) else . end
  ' <<< "$input" > "$TEST_STATE/objects/$kind.$ns.$name.json"
}
case "$verb" in
  get)
    kind=$1
    if [[ "$kind" == crd ]]; then exit 0; fi
    if [[ "$kind" == mutatingwebhookconfigurations,validatingwebhookconfigurations ]]; then
      jq -s '{items:map(select(.kind=="MutatingWebhookConfiguration" or .kind=="ValidatingWebhookConfiguration"))}' "$TEST_STATE"/objects/*.json
      exit 0
    fi
    kind=$(canonical "$kind"); name=${2:-}; [[ "$kind" != Namespace ]] || namespace=default
    file="$TEST_STATE/objects/$kind.$namespace.$name.json"
    if [[ ! -f "$file" ]]; then
      [[ " $* " == *' --ignore-not-found '* ]] && exit 0
      exit 1
    fi
    case "$*" in
      *jsonpath*spec.secretName*) jq -r '.spec.secretName' "$file";;
      *jsonpath*data.ca*) jq -r '.data["ca.crt"]' "$file";;
      *' -o name'*) printf '%s/%s\n' "$kind" "$name";;
      *) cat "$file";;
    esac;;
  create)
    [[ $1 == namespace ]]
    store "$(jq -n --arg name "$2" '{apiVersion:"v1",kind:"Namespace",metadata:{name:$name}}')";;
  label|annotate)
    kind=$(canonical "$1"); name=$2; shift 2
    file="$TEST_STATE/objects/$kind.$namespace.$name.json"
    for pair in "$@"; do
      [[ "$pair" == *=* ]] || continue
      key=${pair%%=*}; val=${pair#*=}; field=labels; [[ "$verb" != annotate ]] || field=annotations
      jq --arg key "$key" --arg val "$val" --arg field "$field" '.metadata[$field][$key]=$val' "$file" > "$TEST_STATE/object.tmp"
      mv "$TEST_STATE/object.tmp" "$file"
    done;;
  apply)
    yq -o=json -I=0 '.' | jq -c '.' | while IFS= read -r object; do store "$object"; done
    echo kubectl:apply >> "$TEST_STATE/events";;
  patch)
    kind=$(canonical "$1"); name=$2; shift 2
    while [[ $# -gt 0 ]]; do if [[ $1 == --patch-file ]]; then patch=$2; break; fi; shift; done
    file="$TEST_STATE/objects/$kind.$namespace.$name.json"
    jq --slurpfile patch "$patch" '. * $patch[0] | .metadata.annotations |= with_entries(select(.value!=null)) | .metadata.labels |= with_entries(select(.value!=null))' "$file" > "$TEST_STATE/object.tmp"
    mv "$TEST_STATE/object.tmp" "$file";;
  wait|rollout)
    echo "kubectl:$verb" >> "$TEST_STATE/events"
    [[ ${TEST_FAIL_WAIT:-false} != true ]];;
  delete)
    [[ $1 == secret && $2 == sh.helm.release.v1.*.v1 ]]
    rm -f "$TEST_STATE/release.json" "$TEST_STATE/history.json";;
  *) echo "unsupported mock kubectl: $verb $*" >&2; exit 1;;
esac
