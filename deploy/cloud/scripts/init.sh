#!/bin/bash
set -ex

cloudDomain="127.0.0.1.nip.io"
tlsCrtPlaceholder="<tls-crt-placeholder>"
tlsKeyPlaceholder="<tls-key-placeholder>"
mongodb_uri=""

function read_env {
  source $1
}

function create_tls_secret {
  if grep -q $tlsCrtPlaceholder manifests/tls-secret.yaml; then
    echo "mock tls secret"
    kubectl apply -f manifests/mock-cert.yaml
    echo "mock tls cert has been created successfully."
  else
    echo "tls secret is already set"
    kubectl apply -f manifests/tls-secret.yaml
  fi
}

function sealos_run_controller {
  # run user controller
  sealos run tars/user.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort="6443"

  # run terminal controller
  sealos run tars/terminal.tar \
  --env cloudDomain=$cloudDomain \
  --env userNamespace="user-system" \
  --env wildcardCertSecretName="wildcard-cert" \
  --env wildcardCertSecretNamespace="sealos-system"

  # run app controller
  sealos run tars/app.tar
}

function gen_mongodb_uri() {
  # if mongodb_uri is empty then apply kubeblocks mongodb cr and gen mongodb uri
  if [ -z "$mongodb_uri" ]; then
    echo "no mongodb uri found, apply kubeblocks mongodb cr"
    kubectl apply -f manifests/mongodb.yaml
    # if there is no sealos-mongodb-conn-credential secret then wait for mongodb ready
    while [ -z "$(kubectl get secret -n sealos sealos-mongodb-conn-credential)" ]; do
      echo "waiting for mongodb secret generated"
      sleep 5
    done
    chmod +x scripts/gen-mongodb-uri.sh
    mongodb_uri=$(scripts/gen-mongodb-uri.sh)
  fi
}

function sealos_run_frontend {
  # mutate desktop config before running desktop
  echo "mutate desktop config"
  mutate_desktop_config

  echo "run desktop frontend"
  sealos run tars/frontend-desktop.tar \
    --env cloudDomain=$cloudDomain \
    --env certSecretName="wildcard-cert" \
    --env passwordEnabled="true" \
    --config-file etc/sealos/desktop-config.yaml

  echo "run applaunchpad frontend"
  sealos run tars/frontend-applaunchpad.tar \
  --env cloudDomain=$cloudDomain \
  --env certSecretName="wildcard-cert"

  echo "run terminal frontend"
  sealos run tars/frontend-terminal.tar \
  --env cloudDomain=$cloudDomain \
  --env certSecretName="wildcard-cert"

  echo "run dbprovider frontend"
  sealos run tars/frontend-dbprovider.tar \
  --env cloudDomain=$cloudDomain \
  --env certSecretName="wildcard-cert"
}


function mutate_desktop_config() {
  # mutate etc/sealos/desktop-config.yaml by using mongodb uri and two random base64 string
  sed -i -e "s;<your-mongodb-uri-base64>;$(echo -n "$mongodb_uri" | base64 -w 0);" etc/sealos/desktop-config.yaml
  sed -i -e "s;<your-jwt-secret-base64>;$(tr -cd 'a-z0-9' </dev/urandom | head -c64 | base64 -w 0);" etc/sealos/desktop-config.yaml
  sed -i -e "s;<your-password-salt-base64>;$(tr -cd 'a-z0-9' </dev/urandom | head -c64 | base64 -w 0);" etc/sealos/desktop-config.yaml
}

function install {
  # read env
  read_env etc/sealos/cloud.env

  # kubectl apply namespace, secret and mongodb
  kubectl apply -f manifests/namespace.yaml

  # create tls secret
  create_tls_secret $cloudDomain

  # gen mongodb uri
  gen_mongodb_uri

  # sealos run controllers
  sealos_run_controller

  # sealos run frontends
  sealos_run_frontend
}

install
