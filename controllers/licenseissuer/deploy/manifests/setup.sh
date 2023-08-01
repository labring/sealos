#! /bin/bash
kubectl apply -f manifests/deploy.yaml

while kubectl get crd | grep -q "launchers.infostream.sealos.io"; do
    echo "Waiting for launchers.infostream.sealos.io CRD to be created..."
    sleep 1
done

kubectl apply -f manifests/customconfig.yaml