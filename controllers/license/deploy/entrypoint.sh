#!/bin/bash
HELM_OPTS=${HELM_OPTS:-""}
kubectl delete --ignore-not-found -f uninstall
kubectl delete clusterrole license-manager-role --ignore-not-found
helm upgrade  -i license -n license-system --create-namespace ./charts/license  ${HELM_OPTS}
helm show crds ./charts/license | kubectl apply -f - --server-side  --force-conflicts
