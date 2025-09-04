#!/usr/bin/env bash
set -e

NAME=${NAME:-"openebs"}
NAMESPACE=${NAMESPACE:-"openebs"}
HELM_OPTS=${HELM_OPTS:-" \
--set ndm.enabled=false \
--set ndmOperator.enabled=false \
--set localprovisioner.deviceClass.enabled=false \
--set localprovisioner.hostpathClass.isDefaultClass=true \
--set lvm-localpv.enabled=true \
"}
rm -rf ./charts/openebs/crds/lvm*
cp -r ./charts/openebs/charts/lvm-localpv/crds/*.yaml ./charts/openebs/crds/
OPENEBS_STORAGE_PREFIX=${OPENEBS_STORAGE_PREFIX:-"/var/openebs"}
OPENEBS_LOCAL_ENABLE=${OPENEBS_LOCAL_ENABLE:-"true"}

helm upgrade -i ${NAME} ./charts/${NAME} -n ${NAMESPACE} --create-namespace ${HELM_OPTS} --set varDirectoryPath.baseDir="${OPENEBS_STORAGE_PREFIX}" \
    --set localprovisioner.basePath="${OPENEBS_STORAGE_PREFIX}/local" --set localprovisioner.enabled="${OPENEBS_LOCAL_ENABLE}"

