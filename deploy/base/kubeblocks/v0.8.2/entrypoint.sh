#!/usr/bin/env bash

set -e
kubectl create -f charts/kubeblocks/crds/kubeblocks_crds.yaml || kubectl replace -f charts/kubeblocks/crds/kubeblocks_crds.yaml
sleep 2
helm upgrade -i kubeblocks charts/kubeblocks --set snapshot-controller.enabled=true --insecure-skip-tls-verify -n kb-system --create-namespace
cp -rf opt/kbcli /usr/bin/

bash scripts/install_kbcli_addons.sh

REPO_NAME="backup"
if kbcli backuprepo list | awk -v repo="$REPO_NAME" 'NR>1 && $1 == repo {found=1; exit} END {exit !found}'; then
    echo "backup '$REPO_NAME' is already exists, skip create it."
else
    echo "
    backup '$REPO_NAME'..."
    kubectl apply -f manifests/backuprepo.yaml
fi

kbcli backuprepo list