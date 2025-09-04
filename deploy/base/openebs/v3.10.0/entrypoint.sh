#!/usr/bin/env bash
set -e

NAME=${NAME:-"openebs"}
NAMESPACE=${NAMESPACE:-"openebs"}
UNINSTALL=${UNINSTALL:-"false"}
HELM_OPTS=${HELM_OPTS:-" \
--set ndm.enabled=false \
--set ndmOperator.enabled=false \
--set localprovisioner.deviceClass.enabled=false \
--set localprovisioner.hostpathClass.isDefaultClass=true \
"}

helm upgrade -i ${NAME} ./charts/${NAME} -n ${NAMESPACE} --create-namespace ${HELM_OPTS}
