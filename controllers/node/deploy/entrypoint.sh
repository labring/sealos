#!/bin/bash
HELM_OPTS=${HELM_OPTS:-""}
kubectl delete -f ./drop/ --ignore-not-found
helm upgrade  -i node -n node-system --create-namespace ./charts/node  ${HELM_OPTS}
