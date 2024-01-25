#!/usr/bin/env bash
set -e

ADMIN_SECRET="object-storage-user-0"
INTERNAL_ENDPOINT="object-storage.${NAMESPACE}.svc.cluster.local"
EXTERNAL_ENDPOINT="objectstorageapi.${DOMAIN}"

kubectl apply -f manifests/deploy.yaml