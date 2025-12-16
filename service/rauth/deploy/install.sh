#!/bin/bash

HELM_OPTS=${HELM_OPTS:-""}

helm upgrade -i rauth \
    -n devbox-system --create-namespace \
    ./charts/rauth \
    ${HELM_OPTS} \
    --wait
