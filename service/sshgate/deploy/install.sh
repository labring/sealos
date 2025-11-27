#!/bin/bash

HELM_OPTS=${HELM_OPTS:-""}

helm upgrade -i sshgate -n devbox-system --create-namespace charts ${HELM_OPTS} --wait
