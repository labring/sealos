#!/bin/bash
set -e

cloudDomain="cloud.io"
tlsCrtPlaceholder="<tls-crt-placeholder>"
tlsKeyPlaceholder="<tls-key-placeholder>"

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
  sealos run tars/terminal.tar --env cloudDomain=$cloudDomain --env userNamespace="user-system" --env wildcardCertSecretName="wildcard-cert" --env wildcardCertSecretNamespace="sealos-system"

  # run app controller
  sealos run tars/app.tar
}


function sealos_run_frontend {
  sealos run tars/frontend-desktop.tar --env cloudDomain=$cloudDomain --env certSecretName="wildcard-cert"

  sealos run tars/frontend-applaunchpad.tar --env cloudDomain=$cloudDomain --env certSecretName="wildcard-cert"

  sealos run tars/frontend-terminal.tar --env cloudDomain=$cloudDomain --env certSecretName="wildcard-cert"
}


function install {
  # read env
  read_env etc/sealos/cloud.env
  # mock tls
  mock_tls $cloudDomain
  # add cert for cloud domain
  sealos cert --alt-name="$cloudDomain"
  # kubectl apply namespace and secret
  kubectl apply -f manifests
  # sealos run controllers
  sealos_run_controller
  # sealos run frontends
  sealos_run_frontend
}

install
