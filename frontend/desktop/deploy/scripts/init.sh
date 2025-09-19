#!/bin/bash
set -e
kubectl apply -f manifests/configmap.yaml
kubectl apply -f manifests/deploy.yaml -f manifests/rbac.yaml -f manifests/ingress.yaml
kubectl rollout restart deploy desktop-frontend -n sealos