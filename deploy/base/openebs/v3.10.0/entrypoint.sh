#!/usr/bin/env bash
set -e

NAME=${NAME:-"openebs"}
NAMESPACE=${NAMESPACE:-"openebs"}
HELM_OPTS=${HELM_OPTS:-""}

rm -rf ./charts/openebs/crds/lvm*
cp -r ./charts/openebs/charts/lvm-localpv/crds/*.yaml ./charts/openebs/crds/
OPENEBS_STORAGE_PREFIX=${OPENEBS_STORAGE_PREFIX:-"/var/openebs"}
OPENEBS_USE_LVM=${OPENEBS_USE_LVM:-"false"}
NEW_OPTS=""
if [ "$OPENEBS_USE_LVM" == "true" ]; then
   NEW_OPTS="--set localprovisioner.enabled=false --set lvm-localpv.enabled=true \
   --set localprovisioner.hostpathClass.isDefaultClass=false"
else
  NEW_OPTS="--set localprovisioner.enabled=true --set lvm-localpv.enabled=true \
     --set localprovisioner.hostpathClass.isDefaultClass=true"
fi

helm upgrade -i ${NAME} ./charts/${NAME} -n ${NAMESPACE} --create-namespace \
      --set varDirectoryPath.baseDir="${OPENEBS_STORAGE_PREFIX}" \
      --set localprovisioner.basePath="${OPENEBS_STORAGE_PREFIX}/local" \
      --set ndm.enabled=false \
      --set ndmOperator.enabled=false \
      --set localprovisioner.deviceClass.enabled=false \
      --set lvm-localpv.enabled=true \
       ${NEW_OPTS} \
       ${HELM_OPTS}

if [ "$OPENEBS_USE_LVM" == "false" ]; then
cat << EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-backup
  annotations:
    cas.openebs.io/config: |
      - name: StorageType
        value: "hostpath"
      - name: BasePath
        value: "${OPENEBS_STORAGE_PREFIX}/backup"
provisioner: openebs.io/local
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
EOF
fi
