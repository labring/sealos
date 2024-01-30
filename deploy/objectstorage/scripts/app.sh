#!/usr/bin/env bash
set -e

function deploy_app() {
  kubectl apply -f manifests/app/deploy.yaml
}

function install() {
    deploy_app
}

install