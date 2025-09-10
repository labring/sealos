#!/bin/bash
set -e
set -o noglob

# Usage:
#   Provide configuration via environment variables. Two common ways:
#     1) Inline (one-shot) - useful for quick runs or CI:
#          curl -fsSL https://example.com/install-v2.sh | SEALOS_V2_CLOUD_DOMAIN=my.example.com SEALOS_V2_MASTERS="192.0.2.10:22" sh -
#     2) Local execution - export variables, then run the script:
#          export SEALOS_V2_CLOUD_DOMAIN=my.example.com
#          export SEALOS_V2_MASTERS="192.0.2.10:22"
#          ./install-v2.sh
#
# Quick examples:
#   - Single-node test using nip.io (local machine):
#       SEALOS_V2_CLOUD_DOMAIN=127.0.0.1.nip.io SEALOS_V2_MASTERS="127.0.0.1:22" ./install-v2.sh
#   - Download and run with a public domain:
#       curl -fsSL https://example.com/install-v2.sh | SEALOS_V2_CLOUD_DOMAIN=cloud.example.com SEALOS_V2_MASTERS="203.0.113.5:22" sh -
#   - Use exported variables (safer for secrets and automation):
#       export SEALOS_V2_CLOUD_DOMAIN=cloud.example.com
#       export SEALOS_V2_MASTERS="203.0.113.5:22"
#       ./install-v2.sh
#
# Security note:
#   Never run scripts piped from the internet unless you trust and have reviewed them.
#   For automated environments, prefer exporting environment variables (or using secret managers)
#   rather than embedding passwords on the command line.
#
# The script reads configuration from environment variables (see the "Environment variables"
# section below for a full list and descriptions).
#
# Example of a minimal inline invocation for this script:
#   curl -fsSL https://raw.githubusercontent.com/labring/sealos/main/scripts/cloud/install-v2.sh | SEALOS_V2_CLOUD_DOMAIN=192.0.2.10.nip.io SEALOS_V2_KEY_MASTERS="192.0.2.10:22" sh -
#

###
kubernetes_version="v1.28.15"
cilium_version="v1.17.1"
cert_manager_version="v1.14.6"
helm_version="v3.16.2"
openebs_version="v3.10.0"
higress_version="v2.1.3"
kubeblocks_version="v0.8.2"
metrics_server_version="v0.6.4"
victoria_metrics_k8s_stack_version="v1.124.0"
cockroach_version="v2.12.0"
sealos_cert_version="v0.1.0"
sealos_finish_version="v0.1.0"
sealos_cli_proxy_prefix=""
image_registry="ghcr.io"
sealos_cloud_config_dir="/root/.sealos/cloud"

timestamp() {
  date +"%Y-%m-%d %T"
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

warn() {
  flag=$(timestamp)
  echo -e "\033[33m WARN [$flag] >> $* \033[0m"
}

debug() {
  local dbg="${sealos_exec_debug:-}"
  dbg="${dbg,,}"
  if [[ "$dbg" != "1" && "$dbg" != "true" ]]; then
    return 0
  fi
  flag=$(timestamp)
  echo -e "\033[35m DEBUG [$flag] >> $* \033[0m"
}

print() {
  flag=$(timestamp)
  echo -e "\033[1;32m\033[1m INFO [$flag] >> $* \033[0m"
}

if [  -f "sealos.env" ]; then
    info "Loading configuration from sealos.env"
    source sealos.env
fi

export image_repository=${SEALOS_V2_IMAGE_REPO:-"labring/sealos"}
export sealos_cloud_image_repository=${SEALOS_V2_CLOUD_IMAGE_REPO:-"labring"}
export sealos_cloud_version=${SEALOS_V2_CLOUD_VERSION:-"v5.0.1"}
export sealos_cli_version=${SEALOS_V2_CLI_VERSION:-"v5.0.1"}
export github_use_proxy=${SEALOS_V2_PROXY:-"false"}

export max_pod=${SEALOS_V2_MAX_POD:-"120"}
export openebs_storage=${SEALOS_V2_OPENEBS_STORAGE:-"/var/openebs"}
export containerd_storage=${SEALOS_V2_CONTAINERD_STORAGE:-"/var/lib/containerd"}
export pod_cidr=${SEALOS_V2_POD_CIDR:-"100.64.0.0/10"}
export cilium_masksize=${SEALOS_V2_CILIUM_MASKSIZE:-"24"}
export service_cidr=${SEALOS_V2_SERVICE_CIDR:-"10.96.0.0/22"}
export service_nodeport_range=${SEALOS_V2_SERVICE_NODEPORT_RANGE:-"30000-50000"}
export cert_path=${SEALOS_V2_CERT_PATH:-""}
export key_path=${SEALOS_V2_KEY_PATH:-""}

export master_ips=${SEALOS_V2_MASTERS:-""}
export node_ips=${SEALOS_V2_NODES:-""}
export ssh_private_key=${SEALOS_V2_SSH_KEY:-"$HOME/.ssh/id_rsa"}
export ssh_password=${SEALOS_V2_SSH_PASSWORD:-""}
export registry_password=${SEALOS_V2_REGISTRY_PASSWORD:-"passw0rd"}
export sealos_exec_debug=${SEALOS_V2_DEBUG:-"false"}
export dry_run=${SEALOS_V2_DRY_RUN:-"false"}
export sealos_cloud_port=${SEALOS_V2_CLOUD_PORT:-"443"}
export sealos_cloud_domain=${SEALOS_V2_CLOUD_DOMAIN:-""}
export sealos_enable_acme=${SEALOS_V2_ENABLE_ACME:-"false"}

# Print supported environment variables and usage (triggered by -h or --help)
print_env_help() {
  cat <<'HELP'
Supported environment variables (all optional unless noted):

General image & version settings
  SEALOS_V2_IMAGE_REPO         Image repo for runtime components (default: labring/sealos)
  SEALOS_V2_CLOUD_IMAGE_REPO   Image repo for Sealos Cloud image (default: labring)
  SEALOS_V2_CLOUD_VERSION      Sealos Cloud image tag (default: v5.0.1)
  SEALOS_V2_CLI_VERSION        Sealos CLI version to install (default: v5.0.1)
  SEALOS_V2_PROXY              Use proxy for GitHub/images when "true" (default: false)

Cluster / resource settings
  SEALOS_V2_MAX_POD            Max pods per node (default: 120)
  SEALOS_V2_OPENEBS_STORAGE    OpenEBS storage path (default: /var/openebs)
  SEALOS_V2_CONTAINERD_STORAGE Containerd data path (default: /var/lib/containerd)
  SEALOS_V2_REGISTRY_PASSWORD  Password for local image registry (default: passw0rd)
  SEALOS_V2_POD_CIDR           Pod network CIDR (default: 100.64.0.0/10)
  SEALOS_V2_SERVICE_CIDR       Service network CIDR (default: 10.96.0.0/22)
  SEALOS_V2_SERVICE_NODEPORT_RANGE Service NodePort range (default: 30000-50000)
  SEALOS_V2_CILIUM_MASKSIZE    Cilium mask size (default: 24)


Nodes / SSH (for cluster install)
  SEALOS_V2_MASTERS            Master nodes list, comma separated (e.g. 192.0.2.10:22)
  SEALOS_V2_NODES              Worker nodes list, comma separated
  SEALOS_V2_SSH_KEY            SSH private key path (default: $HOME/.ssh/id_rsa)
  SEALOS_V2_SSH_PASSWORD       SSH password (optional, not recommended)

Debug / runtime
  SEALOS_V2_DEBUG              Enable debug logs when set to "true" or "1" (default: false)
  SEALOS_V2_DRY_RUN            If "true", perform a dry run (no changes; commands will be printed)
  SEALOS_V2_CLOUD_PORT         Cloud HTTPS port (default: 443)
  SEALOS_V2_CLOUD_DOMAIN       Cloud domain to expose Sealos Cloud (recommended for TLS)
  SEALOS_V2_ENABLE_ACME        If "true", enable ACME for automatic TLS certs (default: false)
  SEALOS_V2_CERT_PATH          Path to TLS certificate PEM file (if omitted, self-signed cert is used)
  SEALOS_V2_KEY_PATH           Path to TLS private key PEM file

Usage examples
  Inline (one-shot):
    curl -fsSL https://.../install-v2.sh | SEALOS_V2_CLOUD_DOMAIN=example.nip.io SEALOS_V2_MASTERS="127.0.0.1:22" sh -

  Exported (safer for automation):
    export SEALOS_V2_CLOUD_DOMAIN=cloud.example.com
    export SEALOS_V2_MASTERS="203.0.113.5:22"
    ./install-v2.sh

  Load environment variables from a file:
     touch sealos.env
     echo 'SEALOS_V2_CLOUD_DOMAIN=example.nip.io' >> sealos.env
     echo 'SEALOS_V2_MASTERS="203.0.113.5:22" ' >> sealos.env
     ./install-v2.sh


Security note
  Do not run random scripts from the internet. Prefer reviewing the script and using exported env vars or secret managers for sensitive values.
HELP
}

# Detect -h or --help and print supported ENV then exit
for arg in "$@"; do
  case "$arg" in
    -h|--help)
      print_env_help
      exit 0
      ;;
  esac
done

wait_cluster_ready() {
    while true; do
        if kubectl get nodes | grep "NotReady" &> /dev/null; then
           warn "Waiting for all nodes to be Ready..."
           sleep 3
        else
           break 
        fi
    done
}
pull_image() {
  image_name=$1
  info "Pulling image: $image_name"
  if [[ "${dry_run,,}" == "true" ]]; then
    info "[Dry Run] Image pull skipped: $image_name"
    return 0
  fi
  run_and_log "sealos pull -q \"${image_name}\" >/dev/null"
}

run_and_log() {
  local cmd="$1"
  debug "[Step] Running command: $cmd"
  echo "$(date '+%Y-%m-%d %H:%M:%S') $cmd" >> "$sealos_cloud_config_dir/install.log"
  if [[ "${dry_run,,}" == "true" ]]; then
    info "[Dry Run] Command skipped: $cmd"
    return 0
  fi
  eval "$cmd"
  debug "[Step] Command completed: $cmd"
}

proxy_github() {
  if [[ "${github_use_proxy,,}" == "true" ]]; then
    info "Using GitHub proxy for downloads."
    sealos_cli_proxy_prefix="https://ghfast.top"
    image_registry="ghcr.nju.edu.cn"
  fi
}

k8s_installed="n"
k8s_ready="n"

install_pull_images() {
    if kubectl get no > /dev/null 2>&1; then
        k8s_installed="y"
        if ! kubectl get no | grep NotReady > /dev/null 2>&1; then
            k8s_ready="y"
        fi
    fi
    if [  -f "$sealos_cloud_config_dir/install.log" ]; then
        cp -r "$sealos_cloud_config_dir/install.log" "$sealos_cloud_config_dir/install.log.bak"
    fi
    echo "" >"$sealos_cloud_config_dir/install.log"
    # Check for sealos CLI
    if ! command -v sealos &> /dev/null; then
        info "Sealos CLI is not installed, do you want to install it? (y/n): "
        read -p " " installChoice
        if [[ "${installChoice,,}" == "y" ]]; then
          local install_url="https://raw.githubusercontent.com/labring/sealos/main/scripts/install.sh"
          [ -z "$sealos_cli_proxy_prefix" ] || install_url="${sealos_cli_proxy_prefix%/}/$install_url"
          curl -sfL "$install_url" | PROXY_PREFIX=$sealos_cli_proxy_prefix sh -s "${sealos_cli_version}" labring/sealos
        else
            info "Please install sealos CLI to proceed."
            exit 1
        fi
    else
        info "Sealos CLI is already installed."
    fi

    pull_image "${image_registry}/${image_repository}/kubernetes:${kubernetes_version}"
    pull_image "${image_registry}/${image_repository}/cilium:${cilium_version}"
    pull_image "${image_registry}/${image_repository}/cert-manager:${cert_manager_version}"
    pull_image "${image_registry}/${image_repository}/helm:${helm_version}"
    pull_image "${image_registry}/${image_repository}/openebs:${openebs_version}"
    pull_image "${image_registry}/${image_repository}/higress:${higress_version}"
    pull_image "${image_registry}/${image_repository}/kubeblocks:${kubeblocks_version}"
    pull_image "${image_registry}/${image_repository}/cockroach:${cockroach_version}"
    pull_image "${image_registry}/${image_repository}/metrics-server:${metrics_server_version}"
    pull_image "${image_registry}/${image_repository}/victoria-metrics-k8s-stack:${victoria_metrics_k8s_stack_version}"
    pull_image "${image_registry}/${sealos_cloud_image_repository}/sealos-cloud:${sealos_cloud_version}"
    pull_image "${image_registry}/${image_repository}/sealos-finish:${sealos_finish_version}"
    pull_image "${image_registry}/${image_repository}/sealos-certs:${sealos_cert_version}"
}

COMMERCIAL_PROMPT_EN="You are installing the open source version of Sealos Cloud. Some features are missing. \nFor full functionality, please purchase the commercial edition: https://sealos.io/contact"

show_commercial_notice() {
  echo "=========================================================================================================="
  echo -e "\033[1m$COMMERCIAL_PROMPT_EN\033[0m"
  echo "=========================================================================================================="
}

is_absolute_path() {
    [[ "$1" = /* ]]
}

pre_check() {
  print "[Step 1] Environment and dependency checks..."
  if [[ -z "$sealos_cloud_domain" ]]; then
    error "Environment sealos_cloud_domain is not set. Please set it, e.g.: sealos.io"
  fi
  if [[ -n "${cert_path}" ]] || [[ -n "${key_path}" ]]; then
      if ! is_absolute_path "${cert_path}"; then
         error "Environment cert_path must be an absolute path."
      fi
      if ! is_absolute_path "${key_path}"; then
         error "Environment key_path must be an absolute path."
      fi
      if [[ ! -f "${cert_path}" ]]; then
        error "Certificate file not found at cert_path: ${cert_path}"
      fi
      if [[ ! -f "${key_path}" ]]; then
        error "Key file not found at key_path: ${key_path}"
      fi
  fi
  mkdir -p "$sealos_cloud_config_dir"
  info "Environment and dependency checks passed."
}
prepare_configs() {
    print "[Step 2] generating installation commands..."
    sealos_init_cmd="sealos run ${image_registry}/${image_repository}/kubernetes:${kubernetes_version}\
        ${master_ips:+--masters $master_ips}\
        ${node_ips:+--nodes $node_ips}\
        --env KUBEADM_POD_SUBNET=${pod_cidr} \
        --env KUBEADM_SERVICE_SUBNET=${service_cidr}\
        --env KUBEADM_MAX_PODS=${max_pod}\
        --env KUBEADM_SERVICE_RANGE=${SEALOS_V2_SERVICE_NODEPORT_RANGE}\
        --env criData=${containerd_storage}\
        --env registryPassword=${registry_password}\
        --pk=${ssh_private_key:-$HOME/.ssh/id_rsa}\
        --passwd=${ssh_password}"

    sealos_cilium_cmd="sealos run ${image_registry}/${image_repository}/cilium:${cilium_version}\
        --env KUBEADM_POD_SUBNET=${pod_cidr} \
        --env KUBEADM_SERVICE_RANGE=${SEALOS_V2_SERVICE_NODEPORT_RANGE} \
        --env CILIUM_MASKSIZE=${cilium_masksize}"

}
execute_commands() {
    print "[Step 3] Starting Kubernetes and core components installation; kubernetes status: ${k8s_installed}..."
    [[ $k8s_installed == "y" ]] || run_and_log "$sealos_init_cmd"
    run_and_log "sealos run ${image_registry}/${image_repository}/helm:${helm_version}"
    [[ $k8s_ready == "y" ]] || run_and_log "$sealos_cilium_cmd"
    if [[ "${dry_run,,}" == "false" ]]; then
      wait_cluster_ready
    fi
    run_and_log "sealos run ${image_registry}/${image_repository}/cert-manager:${cert_manager_version}"
    run_and_log "sealos run  --env OPENEBS_STORAGE_PREFIX=${openebs_storage} ${image_registry}/${image_repository}/openebs:${openebs_version}"
    run_and_log "sealos run ${image_registry}/${image_repository}/metrics-server:${metrics_server_version}"
    run_and_log "sealos run ${image_registry}/${image_repository}/cockroach:${cockroach_version}"
    run_and_log "sealos run ${image_registry}/${image_repository}/victoria-metrics-k8s-stack:${victoria_metrics_k8s_stack_version}"
    run_and_log "sealos run --env SEALOS_CLOUD_PORT=${sealos_cloud_port} --env SEALOS_CLOUD_DOMAIN=${sealos_cloud_domain} ${image_registry}/${image_repository}/higress:${higress_version}"
    run_and_log "sealos run ${image_registry}/${image_repository}/kubeblocks:${kubeblocks_version}"
    print "[Step 4] Starting Sealos Cloud installation..."

    run_and_log "sealos run ${image_registry}/${sealos_cloud_image_repository}/sealos-cloud:${sealos_cloud_version} --env SEALOS_CLOUD_DOMAIN=\"${sealos_cloud_domain}\" --env SEALOS_CLOUD_PORT=\"${sealos_cloud_port}\" "
    if [[ "${sealos_enable_acme,,}" == "true" ]]; then
        run_and_log "sealos run ${image_registry}/${image_repository}/sealos-certs:${sealos_cert_version} --env SEALOS_CLOUD_CERT_MODE=acmedns "
    elif [[ -n "${cert_path}" ]] || [[ -n "${key_path}" ]]; then
        run_and_log "sealos run ${image_registry}/${image_repository}/sealos-certs:${sealos_cert_version} --env SEALOS_CLOUD_CERT_MODE=https --env SEALOS_CLOUD_CERT_CRT_PATH=${cert_path} --env SEALOS_CLOUD_CERT_KEY_PATH=${key_path}"
    else
        run_and_log "sealos run ${image_registry}/${image_repository}/sealos-certs:${sealos_cert_version} --env SEALOS_CLOUD_CERT_MODE=self-signed "
    fi
}

declare -A cloudImages

cloudImages=(
    # controllers
    ["user"]="sealos-cloud-user-controller"
    ["terminal"]="sealos-cloud-terminal-controller"
    ["app"]="sealos-cloud-app-controller"
    ["resources"]="sealos-cloud-resources-controller"
    ["account"]="sealos-cloud-account-controller"
    ["license"]="sealos-cloud-license-controller"

    # frontends
    ["frontend-desktop"]="sealos-cloud-desktop-frontend"
    ["frontend-terminal"]="sealos-cloud-terminal-frontend"
    ["frontend-applaunchpad"]="sealos-cloud-applaunchpad-frontend"
    ["frontend-dbprovider"]="sealos-cloud-dbprovider-frontend"
    ["frontend-costcenter"]="sealos-cloud-costcenter-frontend"
    ["frontend-template"]="sealos-cloud-template-frontend"
    ["frontend-license"]="sealos-cloud-license-frontend"
    ["frontend-cronjob"]="sealos-cloud-cronjob-frontend"

    # services
    ["database-service"]="sealos-cloud-database-service"
    ["account-service"]="sealos-cloud-account-service"
    ["launchpad-service"]="sealos-cloud-launchpad-service"
    ["job-init"]="sealos-cloud-job-init-controller"
    ["job-heartbeat"]="sealos-cloud-job-heartbeat-controller"
)

run_cloud(){
    registry_domain="sealos.hub:5000"
    run_and_log "sealos login -u admin -p ${registry_password} ${registry_domain}"
    for name in "${!cloudImages[@]}"; do
       run_and_log "sealos pull --policy=always -q  ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages[$name]}:${sealos_cloud_version}"
    done
    if [[ "${dry_run,,}" == "false" ]]; then
      varCloudDomain=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudDomain}')
      varCloudPort=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.cloudPort}')
      varRegionUID=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.regionUID}')
      varDatabaseGlobalCockroachdbURI=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.databaseGlobalCockroachdbURI}')
      varDatabaseLocalCockroachdbURI=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.databaseLocalCockroachdbURI}')
      varDatabaseMongodbURI=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.databaseMongodbURI}')
      varPasswordSalt=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.passwordSalt}')
      varJwtInternal=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.jwtInternal}')
      varJwtRegional=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.jwtRegional}')
      varJwtGlobal=$(kubectl get configmap sealos-config -n sealos-system -o jsonpath='{.data.jwtGlobal}')
    fi
    print "[Step 5] Starting Sealos Cloud Desktop Frontend..."
    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/sealos-cloud-desktop-frontend:${sealos_cloud_version} \
              --env cloudDomain=${varCloudDomain} \
              --env cloudPort=\"${varCloudPort}\" \
              --env certSecretName=\"wildcard-cert\" \
              --env passwordEnabled=\"true\" \
              --env passwordSalt=\"${varPasswordSalt}\" \
              --env regionUID=\"${varRegionUID}\" \
              --env databaseMongodbURI=\"${varDatabaseMongodbURI}/sealos-auth?authSource=admin\" \
              --env databaseLocalCockroachdbURI=\"${varDatabaseLocalCockroachdbURI}\" \
              --env databaseGlobalCockroachdbURI=\"${varDatabaseGlobalCockroachdbURI}\" \
              --env jwtInternal=\"${varJwtInternal}\" \
              --env jwtRegional=\"${varJwtRegional}\" \
              --env jwtGlobal=\"${varJwtGlobal}\" "
    if [[ "${dry_run,,}" == "false" ]]; then
      while true; do
        # shellcheck disable=SC2126
        NOT_RUNNING=$(kubectl get pods -n sealos --no-headers | grep desktop-frontend | grep -v "Running" | wc -l)
        if [[ $NOT_RUNNING -eq 0 ]]; then
            info "All pods are in Running state for desktop-frontend !"
            break
        else
            warn "Waiting for pods to be in Running state for desktop-frontend..."
            sleep 15
        fi
      done
    fi
    print "[Step 6] Starting Sealos Cloud Controllers and Services..."
    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["user"]}:${sealos_cloud_version} \
    --env cloudDomain=\"${varCloudDomain}\" \
    --env apiserverPort=\"6443\" "

    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["terminal"]}:${sealos_cloud_version} \
    --env cloudDomain=\"${varCloudDomain}\" \
    --env cloudPort=\"${varCloudPort}\" \
    --env userNamespace=\"user-system\" \
    --env wildcardCertSecretName=\"wildcard-cert\" \
    --env wildcardCertSecretNamespace=\"sealos-system\" "

    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["app"]}:${sealos_cloud_version}"

    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["resources"]}:${sealos_cloud_version} \
    --env MONGO_URI=\"${varDatabaseMongodbURI}\" --env DEFAULT_NAMESPACE=\"resources-system\" "

    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["account"]}:${sealos_cloud_version} \
    --env MONGO_URI=\"${varDatabaseMongodbURI}\" \
    --env cloudDomain=\"${varCloudDomain}\" \
    --env cloudPort=\"${varCloudPort}\" \
    --env DEFAULT_NAMESPACE=\"account-system\" \
    --env GLOBAL_COCKROACH_URI=\"${varDatabaseGlobalCockroachdbURI}\" \
    --env LOCAL_COCKROACH_URI=\"${varDatabaseLocalCockroachdbURI}\" \
    --env LOCAL_REGION=\"${varRegionUID}\" \
    --env ACCOUNT_API_JWT_SECRET=\"${varJwtInternal}\" "

    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["account-service"]}:${sealos_cloud_version} --env cloudDomain=\"${varCloudDomain}\" --env cloudPort=\"${varCloudPort}\" "

    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["license"]}:${sealos_cloud_version}"

    print "[Step 7] Starting Sealos Cloud Authorize..."
    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["job-init"]}:${sealos_cloud_version} --env PASSWORD_SALT=$(echo -n \"${varPasswordSalt}\") "
    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["job-heartbeat"]}:${sealos_cloud_version}"

    if [[ "${dry_run,,}" == "false" ]]; then
        while [ -z "$(kubectl get ns ns-admin 2>/dev/null)" ]; do
          sleep 1
        done
    fi

    print "[Step 8] Starting Sealos Cloud Frontends..."

    if [[ -n "${cert_path}" ]] || [[ -n "${key_path}" ]]; then
       tls_optional=""
    else
      tls_optional="--env tlsRejectUnauthorized=1"
    fi

    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["frontend-applaunchpad"]}:${sealos_cloud_version} \
      --env cloudDomain=${varCloudDomain} \
      --env cloudPort=\"${varCloudPort}\" \
      ${tls_optional} \
      --env certSecretName=\"wildcard-cert\" "

    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["frontend-terminal"]}:${sealos_cloud_version} \
    --env cloudDomain=${varCloudDomain} \
    --env cloudPort=\"${varCloudPort}\" \
    --env certSecretName=\"wildcard-cert\" "

    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["frontend-dbprovider"]}:${sealos_cloud_version} \
    --env cloudDomain=${varCloudDomain} \
    --env cloudPort=\"${varCloudPort}\" \
    --env certSecretName=\"wildcard-cert\" "

    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["frontend-costcenter"]}:${sealos_cloud_version} \
    --env cloudDomain=${varCloudDomain} \
    --env cloudPort=\"${varCloudPort}\" \
    --env certSecretName=\"wildcard-cert\" \
    --env transferEnabled=\"true\" \
    --env rechargeEnabled=\"false\" \
    --env jwtInternal=\"${varJwtInternal}\" "

    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["frontend-template"]}:${sealos_cloud_version} \
    --env cloudDomain=${varCloudDomain} \
    --env cloudPort=\"${varCloudPort}\" \
    --env certSecretName=\"wildcard-cert\" "

    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["frontend-license"]}:${sealos_cloud_version} \
    --env cloudDomain=${varCloudDomain} \
    --env cloudPort=\"${varCloudPort}\" \
    --env certSecretName=\"wildcard-cert\" \
    --env MONGODB_URI=\"${varDatabaseMongodbURI}/sealos-license?authSource=admin\" \
    --env licensePurchaseDomain=\"license.sealos.io\" "

    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["frontend-cronjob"]}:${sealos_cloud_version} \
    --env cloudDomain=${varCloudDomain} \
    --env cloudPort=\"${varCloudPort}\" \
    --env certSecretName=\"wildcard-cert\" "

    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["database-service"]}:${sealos_cloud_version}"

    run_and_log "sealos run ${registry_domain}/${sealos_cloud_image_repository}/${cloudImages["launchpad-service"]}:${sealos_cloud_version}"

}

finish_info(){
    run_and_log "sealos run ${image_registry}/${image_repository}/sealos-finish:${sealos_finish_version} --env SEALOS_CLOUD_DIR=${sealos_cloud_config_dir}  "
}

{
  show_commercial_notice
  proxy_github
  pre_check
  install_pull_images
  prepare_configs
  execute_commands
  run_cloud
  finish_info
}
