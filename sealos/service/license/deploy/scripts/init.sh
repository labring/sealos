#!/bin/bash

set -ex

kubectl apply -f manifests/deploy.yaml -f manifests/rbac.yaml -f manifests/ingress.yaml

secret_exists=$(kubectl get secret desktop-frontend-secret -n sealos --ignore-not-found=true)
if [[ -n "$secret_exists" ]]; then
  echo "desktop-frontend-secret already exists, skip create desktop secret"
else
  echo "create desktop secret"
  kubectl apply -f manifests/secret.yaml
fi
