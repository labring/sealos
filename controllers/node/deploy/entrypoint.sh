#!/bin/bash
HELM_OPTS=${HELM_OPTS:-""}
kubectl delete -f "${DROP_DIR:-./drop/}" --ignore-not-found
helm upgrade  -i node -n node-system --create-namespace ./charts/node  ${HELM_OPTS}
