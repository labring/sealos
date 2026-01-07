#!/bin/bash
set -euo pipefail

HELM_OPTS=${HELM_OPTS:-""}

kubectl delete -f ./drop/ --ignore-not-found
helm upgrade -i user -n user-system --create-namespace ./charts/user ${HELM_OPTS}
helm show crds ./charts/user | kubectl apply -f - --server-side --force-conflicts
