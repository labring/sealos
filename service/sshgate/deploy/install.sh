#!/bin/bash

HELM_OPTS=${HELM_OPTS:-""}

helm upgrade -i sshgate \
    -n devbox-system --create-namespace \
    ./chart \
    --set 'tolerations[0].operator=Exists' \
    ${HELM_OPTS} \
    --wait
