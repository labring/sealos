#!/usr/bin/env bash
set -euo pipefail
verb=$1; shift
if [[ $verb == version || $verb == template || $verb == lint || $verb == package ]]; then exec "$REAL_HELM" "$verb" "$@"; fi
args=("$@")
case "$verb" in
  list)
    if [[ -f "$TEST_STATE/release.json" ]]; then cat "$TEST_STATE/release.json"; else echo '[]'; fi;;
  history)
    [[ -f "$TEST_STATE/history.json" ]] || exit 1
    cat "$TEST_STATE/history.json";;
  status) [[ -f "$TEST_STATE/release.json" ]];;
  get)
    revision=$(jq -r '.[-1].revision' "$TEST_STATE/history.json")
    for ((i=0;i<$#;i++)); do [[ ${args[$i]} != --revision ]] || revision=${args[$((i+1))]}; done
    cat "$TEST_STATE/revision.$revision.yaml";;
  install|upgrade)
    phase=registration
    [[ " $* " != *' --post-renderer '* ]] || phase=$WEBHOOK_RENDER_MODE
    echo "helm:$phase" >> "$TEST_STATE/events"
    [[ ${TEST_FAIL_PHASE:-} != "$phase" ]] || { echo 'injected Helm failure' >&2; exit 1; }
    render=()
    for ((i=0;i<$#;i++)); do
      case "${args[$i]}" in
        --install|--reset-values|--wait|--atomic) ;;
        --timeout) i=$((i+1));;
        *) render+=("${args[$i]}");;
      esac
    done
    "$REAL_HELM" template "${render[@]}" > "$TEST_STATE/rendered.yaml"
    kubectl apply -f - < "$TEST_STATE/rendered.yaml"
    revision=1
    if [[ -f "$TEST_STATE/history.json" ]]; then revision=$(jq '.[-1].revision+1' "$TEST_STATE/history.json"); fi
    cp "$TEST_STATE/rendered.yaml" "$TEST_STATE/revision.$revision.yaml"
    [[ -f "$TEST_STATE/history.json" ]] || echo '[]' > "$TEST_STATE/history.json"
    jq 'map(.status="superseded")' "$TEST_STATE/history.json" | jq --argjson rev "$revision" '.+[{revision:$rev,status:"deployed"}]' > "$TEST_STATE/history.tmp"
    mv "$TEST_STATE/history.tmp" "$TEST_STATE/history.json"
    jq -n --arg name "$1" '[{name:$name,status:"deployed"}]' > "$TEST_STATE/release.json";;
  rollback)
    revision=$2
    new_revision=$(jq ' .[-1].revision+1' "$TEST_STATE/history.json")
    cp "$TEST_STATE/revision.$revision.yaml" "$TEST_STATE/revision.$new_revision.yaml"
    echo "helm:rollback:$revision" >> "$TEST_STATE/events"
    kubectl apply -f - < "$TEST_STATE/revision.$revision.yaml"
    jq --argjson rev "$revision" 'map(.status="superseded") | .+[{revision:(.[-1].revision+1),status:"deployed"}]' "$TEST_STATE/history.json" > "$TEST_STATE/history.tmp"
    mv "$TEST_STATE/history.tmp" "$TEST_STATE/history.json";;
  *) echo "unsupported mock helm: $verb $*" >&2; exit 1;;
esac
