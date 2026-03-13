#!/bin/bash
HELM_OPTS=${HELM_OPTS:-""}
kubectl delete clusterrole  kube-system-namespace-read-cluster-role --ignore-not-found
kubectl delete clusterrolebinding license-controller-role-binding --ignore-not-found
kubectl delete deployment license-controller-manager -n account-system --ignore-not-found
kubectl delete service license-controller-manager-metrics-service -n account-system --ignore-not-found
kubectl delete clusterrolebinding license-proxy-rolebinding --ignore-not-found
kubectl delete clusterrolebinding license-manager-rolebinding --ignore-not-found
kubectl delete rolebinding license-leader-election-rolebinding -n account-system --ignore-not-found
kubectl delete clusterrole license-manager-role --ignore-not-found
kubectl delete clusterrole license-metrics-reader --ignore-not-found
kubectl delete clusterrole license-proxy-role --ignore-not-found
kubectl delete role license-leader-election-role -n account-system --ignore-not-found
kubectl delete serviceaccount license-controller-manager -n account-system --ignore-not-found
helm upgrade  -i license -n license-system --create-namespace ./charts/license-controller  ${HELM_OPTS}
helm show crds ./charts/license-controller | kubectl apply -f - --server-side  --force-conflicts
