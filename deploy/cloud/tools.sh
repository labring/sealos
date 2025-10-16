#!/bin/bash

function gen_mongodbUri() {
  # if mongodbUri is empty then create mongodb and gen mongodb uri
  if [ -z "$MongoDBURI" ]; then
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
    MongoDBURI=$(scripts/gen-mongodb-uri.sh)
  fi
}

function gen_cockroachdbUri() {
  if [ -z "$cockroachdbUri" ]; then
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
  CockroachLocalDBURI="$cockroachdbUri/local"
  CockroachGlobalDBURI="$cockroachdbUri/global"
}



# TODO: use a better way to check saltKey
function gen_saltKey() {
    password_salt=$(kubectl get configmap desktop-frontend-config -n sealos -o jsonpath='{.data.config\.yaml}' | grep "salt:" | awk '{print $2}' 2>/dev/null | tr -d '"' || true)
    if [[ -z "$password_salt" ]]; then
        PasswordSalt=$(tr -dc 'a-z0-9' </dev/urandom | head -c64)
    else
        PasswordSalt=$password_salt
    fi
}

# TODO: use a better way to check jwt tokens
function gen_jwt_tokens() {
    jwt_internal=$(kubectl get configmap desktop-frontend-config -n sealos -o jsonpath='{.data.config\.yaml}' | grep "internal:" | awk '{print $2}' 2>/dev/null | tr -d '"' || true)
    if [[ -z "$jwt_internal" ]]; then
        JwtInternal=$(tr -dc 'a-z0-9' </dev/urandom | head -c64)
    else
        JwtInternal=$jwt_internal
    fi
    jwt_regional=$(kubectl get configmap desktop-frontend-config -n sealos -o jsonpath='{.data.config\.yaml}' | grep "regional:" | awk '{print $2}' 2>/dev/null | tr -d '"' || true)
    if [[ -z "$jwt_regional" ]]; then
        JwtRegional=$(tr -dc 'a-z0-9' </dev/urandom | head -c64)
    else
        JwtRegional=$jwt_regional
    fi
    jwt_global=$(kubectl get configmap desktop-frontend-config -n sealos -o jsonpath='{.data.config\.yaml}' | grep "global:" | awk '{print $2}' 2>/dev/null | tr -d '"' || true)
    if [[ -z "$jwt_global" ]]; then
        JwtGlobal=$(tr -dc 'a-z0-9' </dev/urandom | head -c64)
    else
        JwtGlobal=$jwt_global
    fi
}

function gen_regionUID(){
    uid=$(kubectl get configmap desktop-frontend-config -n sealos -o jsonpath='{.data.config\.yaml}' | grep "regionUID:" | awk '{print $2}' 2>/dev/null | tr -d '"' || true)
    if [[ -z "$uid" ]]; then
        RegionUID=$(uuidgen)
    else
        RegionUID=$(echo -n "$uid")``
    fi
}
