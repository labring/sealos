#!/usr/bin/env bash
# Keep live admission registrations while the backend is rolling. Bootstrap
# adoption records live objects verbatim, so Helm's first revision is a baseline.
set -euo pipefail
: "${WEBHOOK_SNAPSHOT:?snapshot is required}"
: "${WEBHOOK_RENDER_MODE:?render mode is required}"
yq -o=json -I=0 '.' | jq -s --slurpfile snapshot "${WEBHOOK_SNAPSHOT}" --arg mode "${WEBHOOK_RENDER_MODE}" '
  def identity: [.apiVersion, .kind, (.metadata.namespace // ""), .metadata.name];
  def clean: del(.status, .metadata.resourceVersion, .metadata.uid,
    .metadata.generation, .metadata.creationTimestamp, .metadata.managedFields,
    .metadata.annotations."kubectl.kubernetes.io/last-applied-configuration");
  map(select(. != null)) | map(. as $desired |
    ($snapshot[0] | map(select(identity == ($desired | identity))) | first) as $live |
    if $mode == "baseline" and $live != null then
      ($live | clean |
        if .kind == "RuntimeClass" then
          .metadata.annotations["helm.sh/resource-policy"] = "keep"
        else . end)
    elif (.kind == "MutatingWebhookConfiguration" or .kind == "ValidatingWebhookConfiguration") then
      if $live != null then $live | clean else .webhooks = [] end
    else . end
  ) | .[]' | yq -p=json -P
