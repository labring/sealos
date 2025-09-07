#!/bin/bash
set -e

cloudDomain="127.0.0.1.nip.io"
cloudPort=""
mongodbUri=""
cockroachdbUri=""
cockroachdbLocalUri=""
cockroachdbGlobalUri=""
localRegionUID=""
loggerfile="/root/.sealos/cloud/cloud-install.log"

tlsCrtPlaceholder="<tls-crt-placeholder>"
acmednsSecretPlaceholder="<acmedns-secret-placeholder>"
cloudDomainPlaceholder="<cloud-domain-placeholder>"
cloudPortPlaceholder="<cloud-port-placeholder>"
certSecretNamePlaceholder="<cert-secret-placeholder>"
regionUIDPlaceholder="<region-uid-placeholder>"
databaseMongodbURIPlaceholder="<mongodb-uri-placeholder>"
databaseLocalCockroachdbURIPlaceholder="<local-cockroachdb-uri-placeholder>"
databaseGlobalCockroachdbURIPlaceholder="<global-cockroachdb-uri-placeholder>"
passwordEnabledPlaceholder="<password-enabled-placeholder>"
passwordSaltPlaceholder="<password-salt-placeholder>"
jwtInternalPlaceholder="<jwt-internal-placeholder>"
jwtRegionalPlaceholder="<jwt-regional-placeholder>"
jwtGlobalPlaceholder="<jwt-global-placeholder>"


saltKey=""
jwtInternal=""
jwtRegional=""
jwtGlobal=""

source etc/sealos/.env

run_and_log() {
  local cmd="$1"
  echo "[Step] Exec: $cmd"
  echo "$(date '+%Y-%m-%d %H:%M:%S') $cmd" >> "$loggerfile"
  eval "$cmd"
}

function prepare {
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

  # gen jwt tokens
  gen_jwt_tokens

  # create tls secret
  create_tls_secret

  # update sealos-config configmap
  update_sealos_config
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

# TODO: use a better way to check saltKey
function gen_saltKey() {
    password_salt=$(kubectl get configmap desktop-frontend-config -n sealos -o jsonpath='{.data.config\.yaml}' | grep "salt:" | awk '{print $2}' 2>/dev/null | tr -d '"' || true)
    if [[ -z "$password_salt" ]]; then
        saltKey=$(tr -dc 'a-z0-9' </dev/urandom | head -c64)
    else
        saltKey=$password_salt
    fi
}

# TODO: use a better way to check jwt tokens
function gen_jwt_tokens() {
    jwt_internal=$(kubectl get configmap desktop-frontend-config -n sealos -o jsonpath='{.data.config\.yaml}' | grep "internal:" | awk '{print $2}' 2>/dev/null | tr -d '"' || true)
    if [[ -z "$jwt_internal" ]]; then
        jwtInternal=$(tr -dc 'a-z0-9' </dev/urandom | head -c64)
    else
        jwtInternal=$jwt_internal
    fi
    jwt_regional=$(kubectl get configmap desktop-frontend-config -n sealos -o jsonpath='{.data.config\.yaml}' | grep "regional:" | awk '{print $2}' 2>/dev/null | tr -d '"' || true)
    if [[ -z "$jwt_regional" ]]; then
        jwtRegional=$(tr -dc 'a-z0-9' </dev/urandom | head -c64)
    else
        jwtRegional=$jwt_regional
    fi
    jwt_global=$(kubectl get configmap desktop-frontend-config -n sealos -o jsonpath='{.data.config\.yaml}' | grep "global:" | awk '{print $2}' 2>/dev/null | tr -d '"' || true)
    if [[ -z "$jwt_global" ]]; then
        jwtGlobal=$(tr -dc 'a-z0-9' </dev/urandom | head -c64)
    else
        jwtGlobal=$jwt_global
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
  if ! grep -q $tlsCrtPlaceholder manifests/tls-secret.yaml; then
    echo "tls secret is already set"
    kubectl apply -f manifests/tls-secret.yaml
  elif ! grep -q $acmednsSecretPlaceholder manifests/acme-cert.yaml; then
    echo "acme tls secret"
    kubectl apply -f manifests/acme-cert.yaml
    echo "acme tls cert has been created successfully."
  else
    echo "mock tls secret"
    kubectl apply -f manifests/mock-cert.yaml
    echo "mock tls cert has been created successfully."
  fi
}

function update_sealos_config {
  # use generated values to update sealos-config configmap
  echo "update sealos-config configmap"
  echo "cloudDomain: $cloudDomain"
  sed -i "s|$cloudDomainPlaceholder|$cloudDomain|g" manifests/sealos-config.yaml
  echo "cloudPort: $cloudPort"
  sed -i "s|$cloudPortPlaceholder|$cloudPort|g" manifests/sealos-config.yaml
  echo "certSecretName: $certSecretName"
  sed -i "s|$certSecretNamePlaceholder|$certSecretName|g" manifests/sealos-config.yaml
  echo "regionUID: $localRegionUID"
  sed -i "s|$regionUIDPlaceholder|$localRegionUID|g" manifests/sealos-config.yaml
  echo "mongodbUri: $mongodbUri"
  sed -i "s|$databaseMongodbURIPlaceholder|$mongodbUri|g" manifests/sealos-config.yaml
  echo "cockroachdbLocalUri: $cockroachdbLocalUri"
  sed -i "s|$databaseLocalCockroachdbURIPlaceholder|$cockroachdbLocalUri|g" manifests/sealos-config.yaml
  echo "cockroachdbGlobalUri: $cockroachdbGlobalUri"
  sed -i "s|$databaseGlobalCockroachdbURIPlaceholder|$cockroachdbGlobalUri|g" manifests/sealos-config.yaml
  echo "passwordEnabled: $passwordEnabled"
  sed -i "s|$passwordEnabledPlaceholder|$passwordEnabled|g" manifests/sealos-config.yaml
  echo "passwordSalt: $saltKey"
  sed -i "s|$passwordSaltPlaceholder|$saltKey|g" manifests/sealos-config.yaml
  echo "jwtInternal: $jwtInternal"
  sed -i "s|$jwtInternalPlaceholder|$jwtInternal|g" manifests/sealos-config.yaml
  echo "jwtRegional: $jwtRegional"
  sed -i "s|$jwtRegionalPlaceholder|$jwtRegional|g" manifests/sealos-config.yaml
  echo "jwtGlobal: $jwtGlobal"
  sed -i "s|$jwtGlobalPlaceholder|$jwtGlobal|g" manifests/sealos-config.yaml
  echo "apply sealos-config configmap"
  kubectl apply -f manifests/sealos-config.yaml
}


function sealos_run_desktop {
    run_and_log "sealos run tars/frontend-desktop.tar \
      --env cloudDomain=$cloudDomain \
      --env cloudPort=\"$cloudPort\" \
      --env certSecretName=\"wildcard-cert\" \
      --env passwordEnabled=\"true\" \
      --env passwordSalt=\"$saltKey\" \
      --env regionUID=\"$localRegionUID\" \
      --env databaseMongodbURI=\"${mongodbUri}/sealos-auth?authSource=admin\" \
      --env databaseLocalCockroachdbURI=\"$cockroachdbLocalUri\" \
      --env databaseGlobalCockroachdbURI=\"$cockroachdbGlobalUri\" \
      --env jwtInternal=\"$jwtInternal\" \
      --env jwtRegional=\"$jwtRegional\" \
      --env jwtGlobal=\"$jwtGlobal\" "
}

function sealos_run_controller {
  # run user controller
  run_and_log "sealos run tars/user.tar \
  --env cloudDomain=\"$cloudDomain\" \
  --env apiserverPort=\"6443\" "

  # run terminal controller
  run_and_log "sealos run tars/terminal.tar \
  --env cloudDomain=\"$cloudDomain\" \
  --env cloudPort=\"$cloudPort\" \
  --env userNamespace=\"user-system\" \
  --env wildcardCertSecretName=\"wildcard-cert\" \
  --env wildcardCertSecretNamespace=\"sealos-system\" "

  # run app controller
  run_and_log "sealos run tars/app.tar"

  # kubectl apply default desktop apps
  retry_kubectl_apply "manifests/default_apps.yaml"

  # run resources monitoring controller
  run_and_log "sealos run tars/monitoring.tar \
  --env MONGO_URI=\"$mongodbUri\" --env DEFAULT_NAMESPACE=\"resources-system\" "

  # run account controller
  run_and_log "sealos run tars/account.tar \
  --env MONGO_URI=\"$mongodbUri\" \
  --env cloudDomain=\"$cloudDomain\" \
  --env cloudPort=\"$cloudPort\" \
  --env DEFAULT_NAMESPACE=\"account-system\" \
  --env GLOBAL_COCKROACH_URI=\"$cockroachdbGlobalUri\" \
  --env LOCAL_COCKROACH_URI=\"$cockroachdbLocalUri\" \
  --env LOCAL_REGION=\"$localRegionUID\" \
  --env ACCOUNT_API_JWT_SECRET=\"$jwtInternal\" "

  run_and_log "sealos run tars/account-service.tar --env cloudDomain=\"$cloudDomain\" --env cloudPort=\"$cloudPort\" "

  # run license controller
  run_and_log "sealos run tars/license.tar"
}


function sealos_authorize {
  run_and_log "sealos run tars/job-init.tar --env PASSWORD_SALT=$(echo -n \"$saltKey\") "
  run_and_log "sealos run tars/job-heartbeat.tar"

  # wait for admin user create
  echo "Waiting for admin user create"

  while [ -z "$(kubectl get ns ns-admin 2>/dev/null)" ]; do
    sleep 1
  done
}

function sealos_run_frontend {
  run_and_log "sealos run tars/frontend-applaunchpad.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort=\"$cloudPort\" \
  --env certSecretName=\"wildcard-cert\" "

  run_and_log "sealos run tars/frontend-terminal.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort=\"$cloudPort\" \
  --env certSecretName=\"wildcard-cert\" "

  run_and_log "sealos run tars/frontend-dbprovider.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort=\"$cloudPort\" \
  --env certSecretName=\"wildcard-cert\" "

  run_and_log "sealos run tars/frontend-costcenter.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort=\"$cloudPort\" \
  --env certSecretName=\"wildcard-cert\" \
  --env transferEnabled=\"true\" \
  --env rechargeEnabled=\"false\" \
  --env jwtInternal=\"$jwtInternal\" "

  run_and_log "sealos run tars/frontend-template.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort=\"$cloudPort\" \
  --env certSecretName=\"wildcard-cert\" "

  run_and_log "sealos run tars/frontend-license.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort=\"$cloudPort\" \
  --env certSecretName=\"wildcard-cert\" \
  --env MONGODB_URI=\"${mongodbUri}/sealos-license?authSource=admin\" \
  --env licensePurchaseDomain=\"license.sealos.io\" "

  run_and_log "sealos run tars/frontend-cronjob.tar \
  --env cloudDomain=$cloudDomain \
  --env cloudPort=\"$cloudPort\" \
  --env certSecretName=\"wildcard-cert\" "

  run_and_log "sealos run tars/database-service.tar"

  run_and_log "sealos run tars/launchpad-service.tar"
}

function resource_exists {
  kubectl get "$1" >/dev/null 2>&1
}


function install {
  # gen mongodb uri and others
  prepare

  # sealos run desktop
  sealos_run_desktop
  while true; do
    # shellcheck disable=SC2126
    NOT_RUNNING=$(kubectl get pods -n sealos --no-headers | grep desktop-frontend | grep -v "Running" | wc -l)
    if [[ $NOT_RUNNING -eq 0 ]]; then
        echo "All pods are in Running state for desktop-frontend !"
        break
    else
        echo "Waiting for pods to be in Running state for desktop-frontend..."
        sleep 2
    fi
  done

  # sealos run controllers
  sealos_run_controller

  # sealos authorize !!must run after sealos_run_controller frontend-desktop.tar and before sealos_run_frontend
  # TODO fix sealos_authorize in controller/job/init
  sealos_authorize

  # sealos run frontends
  sealos_run_frontend
}

echo "" > $loggerfile
install
