#!/bin/bash

SEALOS_CLOUD_DOMAIN=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudDomain}')
SEALOS_CLOUD_PORT=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudPort}')
SEALOS_CLOUD_CERT_MODE="${SEALOS_CLOUD_CERT_MODE:-"acmedns"}" # acmedns or self-signed and https
SEALOS_CLOUD_CERT_CRT_PATH="${SEALOS_CLOUD_CERT_CRT_PATH:-""}" # only for https
SEALOS_CLOUD_CERT_KEY_PATH="${SEALOS_CLOUD_CERT_KEY_PATH:-""}" # only for https

timestamp() {
  date +"%Y-%m-%d %T"
}
print() {
  flag=$(timestamp)
  echo -e "\033[1;32m\033[1m INFO [$flag] >> $* \033[0m"
}
warn() {
  flag=$(timestamp)
  echo -e "\033[33m WARN [$flag] >> $* \033[0m"
}
error() {
  flag=$(timestamp)
  echo -e "\033[31m ERROR [$flag] >> $* \033[0m"
  exit 1
}
info() {
  flag=$(timestamp)
  echo -e "\033[36m INFO [$flag] >> $* \033[0m"
}
is_absolute_path() {
    [[ "$1" = /* ]]
}
#===========================================================================
kubectl create namespace sealos-system --dry-run=client  -o yaml  | kubectl apply -f -
kubectl create namespace sealos --dry-run=client  -o yaml  | kubectl apply -f -
HELM_OPTS=""
DEFAULT_HELM_OPTS=" --set global.clusterDomain=${SEALOS_CLOUD_DOMAIN} --set global.clusterPort=${SEALOS_CLOUD_PORT} "
if [[ $SEALOS_CLOUD_CERT_MODE == "acmedns" ]]; then
    info "ACME is enabled for automatic TLS certificates."
    acmednsSecret="$(curl -s -X POST https://auth.acme-dns.io/register)"
    fulldomain=$(echo $acmednsSecret | sed -n 's/.*"fulldomain":"\([^"]*\)".*/\1/p')
    if [[ $fulldomain != "" ]]; then
       info "ACME DNS details obtained. Please create a CNAME record for ${SEALOS_CLOUD_DOMAIN} pointing to ${fulldomain}."
    else
      error "Failed to obtain ACME DNS details. Please check your network connectivity."
    fi
    acmednsSecret=$(echo $acmednsSecret | base64 -w0)
    HELM_OPTS=" --set acmedns.enabled=true --set acmedns.host=auth.acme-dns.io --set acmedns.fullDomain=${fulldomain} --set acmedns.secret=${acmednsSecret} "
fi

if [[ $SEALOS_CLOUD_CERT_MODE == "https" ]]; then
    if ! is_absolute_path "$SEALOS_CLOUD_CERT_CRT_PATH"; then
       error "Environment SEALOS_CLOUD_CERT_CRT_PATH must be an absolute path."
    fi
    if ! is_absolute_path "$SEALOS_CLOUD_CERT_KEY_PATH"; then
       error "Environment SEALOS_CLOUD_CERT_KEY_PATH must be an absolute path."
    fi
    if [[ ! -f $SEALOS_CLOUD_CERT_CRT_PATH ]]; then
      error "Certificate file not found at $SEALOS_CLOUD_CERT_CRT_PATH"
    fi
    if [[ ! -f $SEALOS_CLOUD_CERT_KEY_PATH ]]; then
      error "Key file not found at $SEALOS_CLOUD_CERT_KEY_PATH"
    fi
    cp -rf $SEALOS_CLOUD_CERT_CRT_PATH charts/certs/files/tls.crt
    cp -rf $SEALOS_CLOUD_CERT_KEY_PATH charts/certs/files/tls.key
    info "Custom HTTPS certificates have been configured."
    HELM_OPTS=" --set https.enabled=true --set https.crtPath=$SEALOS_CLOUD_CERT_CRT_PATH --set https.keyPath=$SEALOS_CLOUD_CERT_KEY_PATH "
fi

if [[ $SEALOS_CLOUD_CERT_MODE == "self-signed" ]]; then
    HELM_OPTS=" --set self.enabled=true "
fi

helm upgrade -i cert-config ./charts/certs -n sealos-system ${DEFAULT_HELM_OPTS} ${HELM_OPTS}