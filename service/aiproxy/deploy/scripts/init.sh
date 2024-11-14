#!/bin/bash
set -ex

kubectl create ns aiproxy-system || true

kubectl create -f manifests/aiproxy-config.yaml -n aiproxy-system || true

kubectl apply -f manifests/deploy.yaml -n aiproxy-system

if [[ -n "$cloudDomain" ]]; then
  kubectl create -f manifests/ingress.yaml -n aiproxy-system || true
fi
