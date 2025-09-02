#!/bin/bash
set -e

# Delete script for devbox deployment  
# This script removes the devbox controller and frontend components deployed by sealos run

echo "Deleting devbox deployment..."

# Delete devbox controller resources (deployed via devbox-controller.tar)
echo "Removing devbox controller and system resources..."

# Delete devbox-system namespace (this will remove all resources in the namespace)
kubectl delete namespace devbox-system --ignore-not-found=true

# Delete devbox CRDs (these are cluster-scoped resources)
echo "Removing devbox CRDs..."
kubectl delete crd devboxes.devbox.sealos.io --ignore-not-found=true
kubectl delete crd devboxreleases.devbox.sealos.io --ignore-not-found=true  
kubectl delete crd operationrequests.devbox.sealos.io --ignore-not-found=true

# Delete devbox frontend resources (deployed via devbox-frontend.tar)
# The frontend is likely deployed to sealos-system namespace
echo "Removing devbox frontend from sealos-system namespace..."
kubectl delete deployment,service,ingress -l app=devbox-frontend -n sealos-system --ignore-not-found=true
kubectl delete deployment,service,ingress -l app=devbox -n sealos-system --ignore-not-found=true
kubectl delete deployment,service,ingress -l component=devbox -n sealos-system --ignore-not-found=true

# Remove devbox frontend configmap and secrets
kubectl delete configmap -l app=devbox-frontend -n sealos-system --ignore-not-found=true
kubectl delete configmap -l app=devbox -n sealos-system --ignore-not-found=true
kubectl delete secret -l app=devbox-frontend -n sealos-system --ignore-not-found=true
kubectl delete secret -l app=devbox -n sealos-system --ignore-not-found=true

# Also check if there are any resources with 'devbox' in the name in sealos-system
kubectl get deployment,service,ingress -n sealos-system -o name 2>/dev/null | grep -i devbox | xargs -r kubectl delete -n sealos-system --ignore-not-found=true

echo "Devbox deployment deleted successfully"