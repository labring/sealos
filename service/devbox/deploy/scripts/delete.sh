#!/bin/bash
set -ex

# Delete script for devbox service deployment
# This script removes the devbox service components deployed by kubectl

echo "Deleting devbox service deployment..."

# Delete devbox service resources from devbox-system namespace
kubectl delete -f manifests/deploy.yaml -n devbox-system --ignore-not-found=true

# Delete devbox service config
kubectl delete -f manifests/devbox-config.yaml -n devbox-system --ignore-not-found=true

# Note: We don't delete the devbox-system namespace here as it might be shared 
# with devbox controller. The main devbox delete script will handle namespace deletion.

echo "Devbox service deployment deleted successfully"