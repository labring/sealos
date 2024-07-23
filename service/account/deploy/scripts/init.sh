#!/bin/bash
set -ex

kubectl create cm -n account-system region-info --from-file=manifests/config.json || true

kubectl apply -f manifests/deploy.yaml -n account-system

if [[ -n "$cloudDomain" ]]; then
  kubectl create -f manifests/ingress.yaml -n account-system || true
fi
