#!/usr/bin/env bash
set -e

function deploy_prometheus() {
  kubectl apply -f manifests/prometheus/deploy.yaml
}

function install() {
    deploy_prometheus
}

install