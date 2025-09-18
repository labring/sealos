#!/bin/bash
set -e

# Configuration
APP_NAMESPACE="hubble-service"

# Function to get secret value
get_secret_value() {
  local secret_name=$1
  local key=$2
  local namespace=$3

  base64_value=$(kubectl get secret -n ${namespace} ${secret_name} -o jsonpath="{.data.${key}}") || return $?
  echo "$base64_value" | base64 -d
}

# Function to build redis connection components
build_redis_config() {
  if [[ -z "${REDIS_SECRET_NAME}" ]]; then
    echo "Error: REDIS_SECRET_NAME environment variable is required"
    echo "Usage: export REDIS_SECRET_NAME=your-secret-name"
    exit 1
  fi

  if [[ -z "${REDIS_NAMESPACE}" ]]; then
    echo "Error: REDIS_NAMESPACE environment variable is required"
    echo "Usage: export REDIS_NAMESPACE=your-namespace"
    exit 1
  fi

  local secret_name="${REDIS_SECRET_NAME}"
  local namespace="${REDIS_NAMESPACE}"

  echo "Getting Redis connection details from secret ${secret_name}..."

  username=$(get_secret_value ${secret_name} "username" ${namespace}) || {
    echo "Failed to get Redis username"
    return 1
  }

  password=$(get_secret_value ${secret_name} "password" ${namespace}) || {
    echo "Failed to get Redis password"
    return 1
  }

  host=$(get_secret_value ${secret_name} "host" ${namespace}) || {
    echo "Failed to get Redis host"
    return 1
  }

  port=$(get_secret_value ${secret_name} "port" ${namespace}) || {
    echo "Failed to get Redis port"
    return 1
  }

  redis_addr="${host}:${port}"

  echo "Updating Redis configuration..."
  sed -i "s|<redis-placeholder>|${redis_addr}|g" manifests/configmap.yaml
  sed -i "s|<redis-password-placeholder>|${password}|g" manifests/configmap.yaml

  echo "✓ Redis config updated: ${redis_addr}"
}

# Function to update API server whitelist
update_whitelist() {
  echo "Getting API Server address..."

  API_SERVER_HOST=$(kubectl get endpoints kubernetes -o jsonpath='{.subsets[0].addresses[0].ip}') || {
    echo "Failed to get API server host"
    return 1
  }

  API_SERVER_PORT=$(kubectl get endpoints kubernetes -o jsonpath='{.subsets[0].ports[0].port}') || {
    echo "Failed to get API server port"
    return 1
  }

  API_SERVER_ADDR="${API_SERVER_HOST}:${API_SERVER_PORT}"

  echo "Updating whitelist with API Server address..."
  sed -i "s|whiteList: \"\"|whiteList: \"${API_SERVER_ADDR}\"|g" manifests/configmap.yaml

  echo "✓ Whitelist updated: ${API_SERVER_ADDR}"
}
echo "Creating namespaces..."
kubectl create ns ${APP_NAMESPACE} || true

echo "Updating Redis config..."
build_redis_config

echo "Updating API server whitelist..."
update_whitelist

echo "Deploying Hubble application..."
kubectl apply -f manifests/configmap.yaml -n ${APP_NAMESPACE}
kubectl apply -f manifests/deploy.yaml -n ${APP_NAMESPACE}
echo "✓ Deployment completed successfully!"