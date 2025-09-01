#!/usr/bin/env bash

set -e
kubectl apply -f crds/
kubectl create -f charts/kubeblocks/crds/kubeblocks_crds.yaml || kubectl replace -f charts/kubeblocks/crds/kubeblocks_crds.yaml
sleep 2
helm upgrade -i kubeblocks charts/kubeblocks --set snapshot-controller.enabled=false --insecure-skip-tls-verify -n kb-system --create-namespace
cp -rf opt/kbcli /usr/bin/
kbcli addon enable apecloud-mysql
kbcli addon enable redis
kbcli addon enable postgresql
kbcli addon enable mongodb
kbcli addon enable csi-s3

REPO_NAME="backup"
if kbcli backuprepo list | awk -v repo="$REPO_NAME" 'NR>1 && $1 == repo {found=1; exit} END {exit !found}'; then
    echo "backup '$REPO_NAME' is already exists, skip create it."
else
    echo "
    backup '$REPO_NAME'..."
    kubectl apply -f manifests/backuprepo.yaml
fi

kbcli backuprepo list