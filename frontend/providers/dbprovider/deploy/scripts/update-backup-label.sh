#!/bin/bash

encodeToHex() {
  local input="$1"
  echo -n "$input" | xxd -p | tr -d '\n'
}
 
decodeFromHex() {
  local input="$1"
  echo -n "$input" | xxd -r -p
}

backups=$(kubectl get Backup -A -o json)

echo "$backups" | jq -c '.items[]' | while read -r backup; do
  namespace=$(echo "$backup" | jq -r '.metadata.namespace')
  name=$(echo "$backup" | jq -r '.metadata.name')
  
  labels=$(echo "$backup" | jq -r '.metadata.labels')
  if echo "$labels" | jq -e 'has("backup-remark")' > /dev/null; then
    current_value=$(echo "$labels" | jq -r '.["backup-remark"]')
    
    encoded_value=$(encodeToHex "$current_value")
    
    kubectl patch Backup "$name" -n "$namespace" --type='json' -p="[{\"op\": \"replace\", \"path\": \"/metadata/labels/backup-remark\", \"value\": \"$encoded_value\"}]"
    
    echo "Namespace: $namespace, Name: $name, Backup Remark before: $current_value, Backup Remark after: $encoded_value"
  else
    echo "No backup-remark label found for $namespace/$name"
  fi
done