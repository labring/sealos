#!/bin/bash
set -euo pipefail

HELM_OPTS=${HELM_OPTS:-""}

kubectl delete -f ./drop/ --ignore-not-found
SEALOS_CLOUD_DOMAIN=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudDomain}')

helm upgrade -i user -n user-system --create-namespace ./charts/user --set cloudAPIServerDomain=${SEALOS_CLOUD_DOMAIN} ${HELM_OPTS}
helm show crds ./charts/user | kubectl apply -f - --server-side --force-conflicts
