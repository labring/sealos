#!/bin/bash
set -ex

cloudDomain="127.0.0.1.nip.io"
tlsCrtPlaceholder="<tls-crt-placeholder>"
tlsKeyPlaceholder="<tls-key-placeholder>"
mongodbUri=""

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

  # run resources monitoring controller
  sealos run tars/monitoring.tar \
  --env MONGO_URI="$mongodb_uri" --env DEFAULT_NAMESPACE="resources-system"

  # run resources metering controller
  sealos run tars/metering.tar

  # run account controller
  sealos run tars/account.tar \
  --env MONGO_URI="$mongodb_uri" \
  --env DEFAULT_NAMESPACE="account-system"

}

function gen_mongodbUri() {
  # if mongodbUri is empty then create mongodb and gen mongodb uri
  if [ -z "$mongodbUri" ]; then
    echo "no mongodb uri found, create mongodb and gen mongodb uri"
    kubectl apply -f manifests/mongodb.yaml
    # if there is no sealos-mongodb-conn-credential secret then wait for mongodb ready
    while [ -z "$(kubectl get secret -n sealos sealos-mongodb-conn-credential)" ]; do
      echo "waiting for mongodb secret generated"
      sleep 5
    done
    chmod +x scripts/gen-mongodb-uri.sh
    mongodbUri=$(scripts/gen-mongodb-uri.sh)
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

  echo "costcenter frontend"
  sealos run tars/cost-center.tar \
  --env cloudDomain=$cloudDomain \
  --env certSecretName="wildcard-cert" \
  --env transferEnabled="true" \
  --env rechargeEnabled="false"
}


function mutate_desktop_config() {
  # mutate etc/sealos/desktop-config.yaml by using mongodb uri and two random base64 string
  sed -i -e "s;<your-mongodb-uri-base64>;$(echo -n "$mongodbUri" | base64 -w 0);" etc/sealos/desktop-config.yaml
  sed -i -e "s;<your-jwt-secret-base64>;$(tr -cd 'a-z0-9' </dev/urandom | head -c64 | base64 -w 0);" etc/sealos/desktop-config.yaml
  sed -i -e "s;<your-password-salt-base64>;$(tr -cd 'a-z0-9' </dev/urandom | head -c64 | base64 -w 0);" etc/sealos/desktop-config.yaml
}

function install {
  # read env
  read_env etc/sealos/cloud.env

  # kubectl apply namespace, secret and mongodb
  kubectl apply -f manifests/namespace.yaml

  # apply notifications crd
  kubectl apply -f manifests/notifications_crd.yaml

  # create tls secret
  create_tls_secret $cloudDomain

  # gen mongodb uri
  gen_mongodbUri

  # sealos run controllers
  sealos_run_controller

  # sealos run frontends
  sealos_run_frontend
}

install
