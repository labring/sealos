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

 while true; do
    # shellcheck disable=SC2126
    NOT_RUNNING=$(kubectl get pods -n sealos --no-headers | grep desktop-frontend | grep -v "Running" | wc -l)
    if [[ $NOT_RUNNING -eq 0 ]]; then
        echo "All pods are in Running state for desktop-frontend !"
        break
    else
        echo "Waiting for pods to be in Running state for desktop-frontend..."
        sleep 2
    fi
done