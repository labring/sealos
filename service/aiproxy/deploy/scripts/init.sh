#!/bin/bash
set -e

# Create namespace
kubectl create ns aiproxy-system || true

# Function to wait for secret
wait_for_secret() {
  local secret_name=$1
  local retries=0
  while ! kubectl get secret -n aiproxy-system ${secret_name} >/dev/null 2>&1; do
    sleep 3
    retries=$((retries + 1))
    if [ $retries -ge 30 ]; then
      echo "Timeout waiting for secret ${secret_name}"
      exit 1
    fi
  done
}

# Function to get secret value
get_secret_value() {
  local secret_name=$1
  local key=$2
  base64_value=$(kubectl get secret -n aiproxy-system ${secret_name} -o jsonpath="{.data.${key}}") || return $?
  echo "$base64_value" | base64 -d
}

# Function to build postgres connection string
build_postgres_dsn() {
  local secret_name=$1
  username=$(get_secret_value ${secret_name} "username") || return $?
  password=$(get_secret_value ${secret_name} "password") || return $?
  host=$(get_secret_value ${secret_name} "host") || return $?
  port=$(get_secret_value ${secret_name} "port") || return $?
  echo "postgres://${username}:${password}@${host}:${port}/postgres?sslmode=disable"
}

build_redis_conn() {
  local secret_name=$1
  username=$(get_secret_value ${secret_name} "username") || return $?
  password=$(get_secret_value ${secret_name} "password") || return $?
  host=$(get_secret_value ${secret_name} "host") || return $?
  port=$(get_secret_value ${secret_name} "port") || return $?
  echo "redis://${username}:${password}@${host}:${port}"
}

# Handle JWT configuration
if grep "<sealos-jwt-key-placeholder>" manifests/aiproxy-config.yaml >/dev/null 2>&1; then
  JWT_SECRET=$(kubectl get cm -n account-system account-manager-env -o jsonpath="{.data.ACCOUNT_API_JWT_SECRET}") || exit $?
  sed -i "s|<sealos-jwt-key-placeholder>|${JWT_SECRET}|g" manifests/aiproxy-config.yaml
fi

# Handle PostgreSQL configuration
if grep "<sql-placeholder>" manifests/aiproxy-config.yaml >/dev/null 2>&1; then
  if grep "<sql-log-placeholder>" manifests/aiproxy-config.yaml >/dev/null 2>&1; then
    # Deploy PostgreSQL resources
    kubectl apply -f manifests/pgsql.yaml -n aiproxy-system
    kubectl apply -f manifests/pgsql-log.yaml -n aiproxy-system

    # Wait for secrets
    wait_for_secret "aiproxy-conn-credential"
    wait_for_secret "aiproxy-log-conn-credential"

    # Build connection strings
    SQL_DSN=$(build_postgres_dsn "aiproxy-conn-credential") || exit $?
    LOG_SQL_DSN=$(build_postgres_dsn "aiproxy-log-conn-credential") || exit $?

    # Update config
    sed -i "s|<sql-placeholder>|${SQL_DSN}|g" manifests/aiproxy-config.yaml
    sed -i "s|<sql-log-placeholder>|${LOG_SQL_DSN}|g" manifests/aiproxy-config.yaml
  elif grep "LOG_SQL_DSN: \"\"" manifests/aiproxy-config.yaml >/dev/null 2>&1; then
    # Deploy PostgreSQL resources
    kubectl apply -f manifests/pgsql.yaml -n aiproxy-system

    # Wait for secrets
    wait_for_secret "aiproxy-conn-credential"

    # Build connection strings
    SQL_DSN=$(build_postgres_dsn "aiproxy-conn-credential") || exit $?

    # Update config
    sed -i "s|<sql-placeholder>|${SQL_DSN}|g" manifests/aiproxy-config.yaml
  else
    echo "Error: LOG_SQL_DSN is not allowed to be passed alone, please provide both SQL_DSN and LOG_SQL_DSN or provide SQL_DSN only or neither."
    exit 1
  fi
elif grep "<sql-log-placeholder>" manifests/aiproxy-config.yaml >/dev/null 2>&1; then
  sed -i 's/<sql-log-placeholder>//g' manifests/aiproxy-config.yaml
fi

# Handle Redis configuration
if grep "<redis-placeholder>" manifests/aiproxy-config.yaml >/dev/null 2>&1; then
  kubectl apply -f manifests/redis.yaml -n aiproxy-system

  wait_for_secret "aiproxy-redis-conn-credential"

  # Build redis connection string
  REDIS_CONN=$(build_redis_conn "aiproxy-redis-conn-credential") || exit $?

  sed -i "s|<redis-placeholder>|${REDIS_CONN}|g" manifests/aiproxy-config.yaml
fi

# Deploy application
kubectl apply -f manifests/aiproxy-config.yaml -n aiproxy-system
kubectl apply -f manifests/deploy.yaml -n aiproxy-system

# Create ingress if domain is specified
if [[ -n "$cloudDomain" ]]; then
  kubectl create -f manifests/ingress.yaml -n aiproxy-system || true
fi
