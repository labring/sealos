#!/bin/bash
set -e

cloudDomain="cloud.io"
tlsCrtPlaceholder="<tls-crt-placeholder>"
tlsKeyPlaceholder="<tls-key-placeholder>"
mongodb_uri=""

function read_env {
  source $1
}

function mock_tls {
  if grep -q $tlsCrtPlaceholder manifests/tls-secret.yaml; then
    echo "mock tls secret"
  else
    echo "tls secret is already set"
    return
  fi

  mkdir -p etc/tls
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout etc/tls/tls.key -out etc/tls/tls.crt -subj "/CN=$1" -addext "subjectAltName=DNS:*.$1" > /dev/null
  sed -i -e "s;$tlsCrtPlaceholder;$(base64 -w 0 etc/tls/tls.crt);" -e "s;$tlsKeyPlaceholder;$(base64 -w 0 etc/tls/tls.key);" manifests/tls-secret.yaml
}

function sealos_run_controller {
  # run user controller
  sealos run tars/user.tar

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

  # mock tls
  mock_tls $cloudDomain

  # kubectl apply namespace, secret and mongodb
  kubectl apply -f manifests/namespace.yaml -f manifests/tls-secret.yaml

  # gen mongodb uri
  gen_mongodb_uri

  # sealos run controllers
  sealos_run_controller

  # sealos run frontends
  sealos_run_frontend
}

install
