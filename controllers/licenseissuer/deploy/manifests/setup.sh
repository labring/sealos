#! /bin/bash

# check and create namespace of sealos-system
if ! kubectl get namespace sealos-system &> /dev/null; then
    # if not exist, create namespace and check until it is created
    echo "Namespace sealos-system does not exist. Creating..."
    kubectl create namespace sealos-system
    echo "Waiting for the creation of namespace sealos-system..."
    while ! kubectl get namespace sealos-system &> /dev/null; do
        sleep 1
    done
    echo "Namespace sealos-system created."
else
    echo "Namespace sealos-system already exists. Skipping creation."
fi

kubectl apply -f manifests/deploy.yaml -f manifests/customconfig.yaml