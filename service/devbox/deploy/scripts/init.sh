#!/bin/bash
set -ex

kubectl create ns devbox-system || true

kubectl create -f manifests/devbox-config.yaml -n devbox-system || true

kubectl apply -f manifests/deploy.yaml -n devbox-system