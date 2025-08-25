#!/bin/bash

encodeToHex() {
  local input="$1"
  input=$(echo "$input" | cut -c -30)
  echo -n "$input" | xxd -p | tr -d '\n'
}

decodeFromHex() {
  local input="$1"
  echo -n "$input" | xxd -r -p
}

backups=$(kubectl get Backup -A -o json | jq -c '.items[]')

echo "$backups" | while IFS= read -r backup; do
  namespace=$(echo "$backup" | jq -r '.metadata.namespace')
  name=$(echo "$backup" | jq -r '.metadata.name')

  current_value=$(echo "$backup" | jq -r '.metadata.labels["backup-remark"] // empty')
  if [ -n "$current_value" ]; then
    encoded_value=$(encodeToHex "$current_value")

    kubectl patch Backup "$name" -n "$namespace" --type='json' -p="[{\"op\": \"replace\", \"path\": \"/metadata/labels/backup-remark\", \"value\": \"$encoded_value\"}]"

    echo "Updated $namespace/$name: backup-remark before: $current_value, after: $encoded_value"
  else
    echo "No non-empty backup-remark label found for $namespace/$name"
  fi
done