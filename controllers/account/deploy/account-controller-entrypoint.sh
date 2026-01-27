#!/bin/bash
HELM_OPTS=${HELM_OPTS:-""}
helm upgrade -i account -n account-system --create-namespace ./charts/account-controller ${HELM_OPTS}
