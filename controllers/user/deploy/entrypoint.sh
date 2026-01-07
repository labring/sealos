#!/bin/bash
set -euo pipefail

HELM_OPTS=${HELM_OPTS:-""}

kubectl delete deployment user-controller-manager -n user-system --ignore-not-found
kubectl delete service user-controller-manager-metrics-service -n user-system --ignore-not-found
kubectl delete service user-webhook-service -n user-system --ignore-not-found
kubectl delete configmap user-manager-config -n user-system --ignore-not-found
kubectl delete rolebinding user-leader-election-rolebinding -n user-system --ignore-not-found
kubectl delete role user-leader-election-role -n user-system --ignore-not-found
kubectl delete serviceaccount user-controller-manager -n user-system --ignore-not-found
kubectl delete clusterrolebinding user-manager-rolebinding --ignore-not-found
kubectl delete clusterrolebinding user-proxy-rolebinding --ignore-not-found
kubectl delete clusterrole user-manager-role --ignore-not-found
kubectl delete clusterrole user-metrics-reader --ignore-not-found
kubectl delete clusterrole user-proxy-role --ignore-not-found
kubectl delete clusterrole user-editor-role --ignore-not-found
kubectl delete clusterrole operationrequest-editor-role --ignore-not-found
kubectl delete clusterrole deleterequest-editor-role --ignore-not-found
kubectl delete mutatingwebhookconfiguration user-mutating-webhook-configuration --ignore-not-found
kubectl delete validatingwebhookconfiguration user-validating-webhook-configuration --ignore-not-found
kubectl delete certificate user-serving-cert -n user-system --ignore-not-found || true

helm upgrade -i user -n user-system --create-namespace ./charts/user ${HELM_OPTS}
helm show crds ./charts/user | kubectl apply -f - --server-side --force-conflicts
