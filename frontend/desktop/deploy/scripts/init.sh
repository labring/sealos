#!/bin/bash
set -ex
kubectl apply -f manifests/deploy.yaml -f manifests/rbac.yaml -f manifests/ingress.yaml
cm_exists=$(kubectl get cm desktop-frontend-config -n sealos --ignore-not-found=true)
if [[ -n "$cm_exists" ]]; then
  echo "desktop-frontend-config already exists, skip create desktop config"
else
  echo "create desktop config"
    sed -i -e "s;<your-internal-jwt-secret>;$(tr -cd 'a-z0-9' </dev/urandom | head -c64);" manifests/configmap.yaml
    sed -i -e "s;<your-regional-jwt-secret>;$(tr -cd 'a-z0-9' </dev/urandom | head -c64);" manifests/configmap.yaml
    sed -i -e "s;<your-global-jwt-secret>;$(tr -cd 'a-z0-9' </dev/urandom | head -c64);" manifests/configmap.yaml
  kubectl apply -f manifests/configmap.yaml --validate=false
fi
