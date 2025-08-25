#!/bin/bash
set -ex
kubectl apply -f manifests/deploy.yaml -f manifests/rbac.yaml -f manifests/ingress.yaml
cm_exists=$(kubectl get cm desktop-frontend-config -n sealos --ignore-not-found=true)
if [[ -n "$cm_exists" ]]; then
  echo "desktop-frontend-config already exists, skip create desktop config"
else
  echo "create desktop config"
  kubectl apply -f manifests/configmap.yaml --validate=false
fi
