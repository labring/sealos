#!/bin/bash
set -e

cloudDomain="127.0.0.1.nip.io"
cloudPort=""
mongodbUri=""
cockroachdbUri=""
cockroachdbLocalUri=""
cockroachdbGlobalUri=""
localRegionUID=""

tlsCrtPlaceholder="<tls-crt-placeholder>"
tlsKeyPlaceholder="<tls-key-placeholder>"
saltKey=""

function prepare {
  # source .env
  source etc/sealos/.env

  # kubectl apply namespace, secret and mongodb
  kubectl apply -f manifests/namespace.yaml

  # apply notifications crd
  kubectl apply -f manifests/notifications_crd.yaml

  # gen mongodb uri
  gen_mongodbUri

  # gen cockroachdb uri
  gen_cockroachdbUri

  # gen saltKey if not set or not found in secret
  gen_saltKey

  # gen regionUID if not set or not found in secret
  gen_regionUID

  # create tls secret
  create_tls_secret
}

# Function to retry `kubectl apply -f` command until it succeeds or reaches a maximum number of attempts
retry_kubectl_apply() {
    local file_path=$1  # The path to the Kubernetes manifest file
    local max_attempts=6  # Maximum number of attempts
    local attempt=0  # Current attempt counter
    local wait_seconds=10  # Seconds to wait before retrying

    while [ $attempt -lt $max_attempts ]; do
        # Attempt to execute the kubectl command
        kubectl apply -f "$file_path" >> /dev/null && {
            return 0  # Exit the function successfully
        }
        # If the command did not execute successfully, increase the attempt counter and report failure
        attempt=$((attempt + 1))
        # If the maximum number of attempts has been reached, stop retrying
        if [ $attempt -eq $max_attempts ]; then
            return 1  # Exit the function with failure
        fi
        # Wait for a specified time before retrying
        sleep $wait_seconds
    done
}


function gen_mongodbUri() {
  # if mongodbUri is empty then create mongodb and gen mongodb uri
  if [ -z "$mongodbUri" ]; then
    echo "no mongodb uri found, create mongodb and gen mongodb uri"
    retry_kubectl_apply "manifests/mongodb.yaml"
    echo "waiting for mongodb secret generated"
    message="waiting for mongodb ready"
    # if there is no sealos-mongodb-conn-credential secret then wait for mongodb ready
    while [ -z "$(kubectl get secret -n sealos sealos-mongodb-conn-credential 2>/dev/null)" ]; do
      echo -ne "\r$message   \e[K"
      sleep 0.5
      echo -ne "\r$message .  \e[K"
      sleep 0.5
      echo -ne "\r$message .. \e[K"
      sleep 0.5
      echo -ne "\r$message ...\e[K"
      sleep 0.5
    done
    echo "mongodb secret has been generated successfully."
    chmod +x scripts/gen-mongodb-uri.sh
    mongodbUri=$(scripts/gen-mongodb-uri.sh)
  fi
}

function gen_cockroachdbUri() {
  if [ -z "$cockroachdbUri" ]; then
    echo "no cockroachdb uri found, create cockroachdb and gen cockroachdb uri"
    retry_kubectl_apply "manifests/cockroachdb.yaml"
    message="waiting for cockroachdb ready"

    NAMESPACE="sealos"
    STATEFULSET_NAME="sealos-cockroachdb"

    while : ; do
        if kubectl get statefulset $STATEFULSET_NAME -n $NAMESPACE >/dev/null 2>&1; then
            echo "cockroachdb statefulset is created."
            break
        else
            sleep 10
        fi
    done

    while : ; do
      REPLICAS=$(kubectl get statefulset $STATEFULSET_NAME -n $NAMESPACE -o jsonpath='{.spec.replicas}')
      READY_REPLICAS=$(kubectl get statefulset $STATEFULSET_NAME -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
      if [ "$READY_REPLICAS" == "$REPLICAS" ]; then
        echo -e "\rcockroachdb is ready."
        break
      else
        echo -ne "\r$message    \e[K"
        sleep 0.5
        echo -ne "\r$message .  \e[K"
        sleep 0.5
        echo -ne "\r$message .. \e[K"
        sleep 0.5
        echo -ne "\r$message ...\e[K"
        sleep 0.5
      fi
    done

    echo "cockroachdb secret has been generated successfully."
    chmod +x scripts/gen-cockroachdb-uri.sh
    cockroachdbUri=$(scripts/gen-cockroachdb-uri.sh)
  fi
  cockroachdbLocalUri="$cockroachdbUri/local"
  cockroachdbGlobalUri="$cockroachdbUri/global"
}

function gen_saltKey() {
    password_salt=$(kubectl get configmap desktop-frontend-config -n sealos -o jsonpath='{.data.config\.yaml}' | grep "salt:" | awk '{print $2}' 2>/dev/null | tr -d '"' || true)
    if [[ -z "$password_salt" ]]; then
        saltKey=$(tr -dc 'a-z0-9' </dev/urandom | head -c64)
    else
        saltKey=$password_salt
    fi
}

function gen_regionUID(){
    uid=$(kubectl get configmap desktop-frontend-config -n sealos -o jsonpath='{.data.config\.yaml}' | grep "regionUID:" | awk '{print $2}' 2>/dev/null | tr -d '"' || true)
    if [[ -z "$uid" ]]; then
        localRegionUID=$(uuidgen)
    else
        localRegionUID=$(echo -n "$uid")``
    fi
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

function sealos_run_desktop {
    echo "run desktop frontend"
    sealos run tars/frontend-desktop.tar \
      --env cloudDomain=$cloudDomain \
      --env cloudPort="$cloudPort" \
      --env certSecretName="wildcard-cert" \
      --env passwordEnabled="true" \
      --env passwordSalt="$saltKey" \
      --env regionUID="$localRegionUID" \
      --env databaseMongodbURI="${mongodbUri}/sealos-auth?authSource=admin" \
      --env databaseLocalCockroachdbURI="$cockroachdbLocalUri" \
      --env databaseGlobalCockroachdbURI="$cockroachdbGlobalUri"
}

function sealos_run_controller {
  # run user controller
  sealos run tars/user.tar \
  --env cloudDomain="$cloudDomain" \
  --env apiserverPort="6443"

  # run terminal controller
  sealos run tars/terminal.tar \
  --env cloudDomain="$cloudDomain" \
  --env cloudPort="$cloudPort" \
  --env userNamespace="user-system" \
  --env wildcardCertSecretName="wildcard-cert" \
  --env wildcardCertSecretNamespace="sealos-system"

  # run app controller
  sealos run tars/app.tar

  # kubectl apply default desktop apps
  retry_kubectl_apply "manifests/default_apps.yaml"

  # run resources monitoring controller
  sealos run tars/monitoring.tar \
  --env MONGO_URI="$mongodbUri" --env DEFAULT_NAMESPACE="resources-system"

  # run account controller
  sealos run tars/account.tar \
  --env MONGO_URI="$mongodbUri" \
  --env cloudDomain="$cloudDomain" \
  --env cloudPort="$cloudPort" \
  --env DEFAULT_NAMESPACE="account-system" \
  --env GLOBAL_COCKROACH_URI="$cockroachdbGlobalUri" \
  --env LOCAL_COCKROACH_URI="$cockroachdbLocalUri" \
  --env LOCAL_REGION="$localRegionUID"

  sealos run tars/account-service.tar

  # run license controller
  sealos run tars/license.tar
}


function sealos_authorize {
  sealos run tars/job-init.tar --env PASSWORD_SALT="$(echo -n "$saltKey")"
  sealos run tars/job-heartbeat.tar

  # wait for admin user create
  echo "Waiting for admin user create"

  while [ -z "$(kubectl get ns ns-admin 2>/dev/null)" ]; do
    sleep 1
  done
}

function sealos_run_frontend {
  echo "run applaunchpad frontend"
  sealos run tars/frontend-applaunchpad.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort="$cloudPort" \
  --env certSecretName="wildcard-cert"

  echo "run terminal frontend"
  sealos run tars/frontend-terminal.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort="$cloudPort" \
  --env certSecretName="wildcard-cert"

  echo "run dbprovider frontend"
  sealos run tars/frontend-dbprovider.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort="$cloudPort" \
  --env certSecretName="wildcard-cert"

  echo "run cost center frontend"
  sealos run tars/frontend-costcenter.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort="$cloudPort" \
  --env certSecretName="wildcard-cert" \
  --env transferEnabled="true" \
  --env rechargeEnabled="false"

  echo "run template frontend"
  sealos run tars/frontend-template.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort="$cloudPort" \
  --env certSecretName="wildcard-cert"

  echo "run license frontend"
  sealos run tars/frontend-license.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort="$cloudPort" \
  --env certSecretName="wildcard-cert" \
  --env MONGODB_URI="${mongodbUri}/sealos-license?authSource=admin" \
  --env licensePurchaseDomain="license.sealos.io"

  echo "run cronjob frontend"
  sealos run tars/frontend-cronjob.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort="$cloudPort" \
  --env certSecretName="wildcard-cert"

  echo "run database monitoring"
  sealos run tars/database-service.tar

  echo "run launchpad monitoring"
  sealos run tars/launchpad-service.tar
}

function resource_exists {
  kubectl get "$1" >/dev/null 2>&1
}


function install {
  # gen mongodb uri and others
  prepare

  # sealos run desktop
  sealos_run_desktop

  # sealos run controllers
  sealos_run_controller

  # sealos authorize !!must run after sealos_run_controller frontend-desktop.tar and before sealos_run_frontend
  # TODO fix sealos_authorize in controller/job/init
  sealos_authorize

  # sealos run frontends
  sealos_run_frontend
}

install
