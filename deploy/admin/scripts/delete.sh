#!/bin/bash
set -e

# Delete script for admin deployment
# This script removes the admin frontend components deployed by sealos run tars/frontend-admin.tar

echo "Deleting admin frontend deployment..."

# The admin frontend (sealos-cloud-admin) is typically deployed to sealos-system namespace
# Try multiple possible label selectors to match the admin frontend components

echo "Removing admin frontend from sealos-system namespace..."

# Try common label patterns for admin components
kubectl delete deployment,service,ingress -l app=sealos-cloud-admin -n sealos-system --ignore-not-found=true
kubectl delete deployment,service,ingress -l app=admin -n sealos-system --ignore-not-found=true
kubectl delete deployment,service,ingress -l component=admin -n sealos-system --ignore-not-found=true

# Remove admin frontend configmap and secrets
kubectl delete configmap -l app=sealos-cloud-admin -n sealos-system --ignore-not-found=true
kubectl delete configmap -l app=admin -n sealos-system --ignore-not-found=true
kubectl delete secret -l app=sealos-cloud-admin -n sealos-system --ignore-not-found=true
kubectl delete secret -l app=admin -n sealos-system --ignore-not-found=true

# Also check if there are any resources with 'admin' in the name
kubectl get deployment,service,ingress -n sealos-system -o name 2>/dev/null | grep -i admin | xargs -r kubectl delete -n sealos-system --ignore-not-found=true

echo "Admin frontend deployment deleted successfully"