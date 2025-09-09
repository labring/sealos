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
# Environment variables (usage & descriptions):
#
# General image & version settings
#   SEALOS_V2_IMAGE_REPO           - Optional. Image repository for runtime components (default: "labring/sealos").
#   SEALOS_V2_CLOUD_IMAGE_REPO     - Optional. Image repository for Sealos Cloud image (default: "labring").
#   SEALOS_V2_CLOUD_VERSION        - Optional. Sealos Cloud image tag (default: "v5.0.1").
#   SEALOS_V2_CLI_VERSION          - Optional. Sealos CLI version to install (default: "v5.0.1").
#   SEALOS_V2_PROXY                - Optional. If "true", use proxy for GitHub/images (default: "false").
#
# Cluster / resource settings
#   SEALOS_V2_MAX_POD              - Optional. Maximum pods per node (default: "120").
#   SEALOS_V2_OPENEBS_STORAGE      - Optional. OpenEBS storage path (default: "/var/openebs").
#   SEALOS_V2_CONTAINERD_STORAGE   - Optional. Containerd data path (default: "/var/lib/containerd").
#   SEALOS_V2_POD_CIDR             - Optional. Pod network CIDR (default: "100.64.0.0/10").
#   SEALOS_V2_SERVICE_CIDR         - Optional. Service network CIDR (default: "10.96.0.0/22").
#   SEALOS_V2_SERVICE_NODEPORT_RANGE - Optional. Service NodePort range (default: "30000-50000").
#   SEALOS_V2_CILIUM_MASKSIZE      - Optional. Cilium mask size (default: "24").
#
# TLS / certificate
#   SEALOS_V2_CERT_PATH            - Optional. Path to TLS certificate file to use for Cloud (PEM). If not provided, a self-signed cert is used.
#   SEALOS_V2_KEY_PATH             - Optional. Path to TLS private key file corresponding to SEALOS_V2_CERT_PATH.
#
# Nodes / SSH
#   SEALOS_V2_MASTERS          - Optional. Master nodes list, comma separated. Each item may include :port (example: 192.168.1.1:22,192.168.1.2:22).
#   SEALOS_V2_NODES            - Optional. Worker node list, comma separated.
#   SEALOS_V2_SSH_KEY              - Optional. Path to SSH private key used to connect nodes (default: $HOME/.ssh/id_rsa).
#   SEALOS_V2_SSH_PASSWORD         - Optional. SSH password (if not using key-based auth).
#   SEALOS_V2_REGISTRY_PASSWORD    - Optional. Password for the local image registry (default: "passw0rd").
#
# Debug / runtime
#   SEALOS_V2_DEBUG                - Optional. Enable debug logs when set to "true" or "1" (default: "false").
#   SEALOS_V2_CLOUD_PORT           - Optional. Cloud HTTP(S) port (default: "443").
#   SEALOS_V2_CLOUD_DOMAIN         - Optional. Cloud domain name to expose Sealos Cloud (recommended to set for TLS).
#   SEALOS_V2_DRY_RUN              - Optional. If "true", perform a dry run without making changes (default: "false").
#
# Notes:
#   - Any variable left unset will use the script's built-in default values shown above.
#   - Provide SEALOS_V2_CERT_PATH and SEALOS_V2_KEY_PATH if you want to use a public certificate; otherwise the script will fall back to a self-signed certificate.
#   - For multi-node installs, ensure SSH connectivity from the machine running this script to all target nodes.
#   - Use the pattern ENV_VAR=value ./install-v2.sh or export ENV_VAR=value before running.
#
# Example:
#   SEALOS_V2_CLOUD_DOMAIN=my.example.com SEALOS_V2_MASTERS="192.168.1.10:22" ./install-v2.sh
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
mongodb_version="mongodb-6.0"
sealos_cli_proxy_prefix=""
image_registry="ghcr.io"
sealos_cloud_config_dir="/root/.sealos/cloud"

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
  SEALOS_V2_POD_CIDR           Pod network CIDR (default: 100.64.0.0/10)
  SEALOS_V2_SERVICE_CIDR       Service network CIDR (default: 10.96.0.0/22)
  SEALOS_V2_SERVICE_NODEPORT_RANGE Service NodePort range (default: 30000-50000)
  SEALOS_V2_CILIUM_MASKSIZE    Cilium mask size (default: 24)

TLS / certificate
  SEALOS_V2_CERT_PATH          Path to TLS certificate PEM file (if omitted, self-signed cert is used)
  SEALOS_V2_KEY_PATH           Path to TLS private key PEM file

Nodes / SSH (for cluster install)
  SEALOS_V2_MASTERS            Master nodes list, comma separated (e.g. 192.0.2.10:22)
  SEALOS_V2_NODES              Worker nodes list, comma separated
  SEALOS_V2_SSH_KEY            SSH private key path (default: $HOME/.ssh/id_rsa)
  SEALOS_V2_SSH_PASSWORD       SSH password (optional, not recommended)
  SEALOS_V2_REGISTRY_PASSWORD  Password for local image registry (default: passw0rd)

Debug / runtime
  SEALOS_V2_DEBUG              Enable debug logs when set to "true" or "1" (default: false)
  SEALOS_V2_DRY_RUN            If "true", perform a dry run (no changes; commands will be printed)
  SEALOS_V2_CLOUD_PORT         Cloud HTTPS port (default: 443)
  SEALOS_V2_CLOUD_DOMAIN       Cloud domain to expose Sealos Cloud (recommended for TLS)

Usage examples
  Inline (one-shot):
    curl -fsSL https://.../install-v2.sh | SEALOS_V2_CLOUD_DOMAIN=example.nip.io SEALOS_V2_MASTERS="127.0.0.1:22" sh -

  Exported (safer for automation):
    export SEALOS_V2_CLOUD_DOMAIN=cloud.example.com
    export SEALOS_V2_MASTERS="203.0.113.5:22"
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

ver_ge() {
  # usage: ver_ge "4.19.57" "4.18"
  awk -v a="$1" -v b="$2" 'BEGIN{
    split(a,A,"[.-]"); split(b,B,"[.-]");
    for(i=1;i<=3;i++){ if(A[i]=="") A[i]=0; if(B[i]=="") B[i]=0 }
    for(i=1;i<=3;i++){ if(A[i]>B[i]){print 0; exit} else if(A[i]<B[i]){print 1; exit} }
    print 0
  }'
}

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
  run_and_log "sealos pull -q --policy=always \"${image_name}\" >/dev/null"
}

setMongoVersion() {
  set +e
  grep avx /proc/cpuinfo > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    warn "MongoDB 6.0 version depends on a CPU that supports the AVX instruction set. The current environment does not support AVX, so it has been switched to MongoDB 4.4 version. For more information, see: https://www.mongodb.com/docs/v6.0/administration/production-notes/"
    mongodb_version="mongodb-4.4"
  fi
  set -e
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
}

COMMERCIAL_PROMPT_EN="You are installing the open source version of Sealos Cloud. Some features are missing. \nFor full functionality, please purchase the commercial edition: https://sealos.io/contact"

show_commercial_notice() {
  echo "=========================================================================================================="
  echo -e "\033[1m$COMMERCIAL_PROMPT_EN\033[0m"
  echo "=========================================================================================================="
}

pre_check() {
  print "[Step 1] Environment and dependency checks..."
  if [[ -z "$sealos_cloud_domain" ]]; then
    error "Environment sealos_cloud_domain is not set. Please set it, e.g.: sealos.io"
  fi
  if [[ -z "$master_ips" ]]; then
    error "Environment master_ips is not set. Please set it, e.g.: 192.168.1.2:22,192.168.1.3:22"
  fi
  mkdir -p "$sealos_cloud_config_dir"
  info "Environment and dependency checks passed."
}
prepare_configs() {
    if [[ -n "${cert_path}" ]] || [[ -n "${key_path}" ]]; then
        # Convert certificate and key to base64
        tls_crt_base64=$(cat $cert_path | base64 | tr -d '\n')
        tls_key_base64=$(cat $key_path | base64 | tr -d '\n')

        # Define YAML content for certificate
        tls_config="
apiVersion: apps.sealos.io/v1beta1
kind: Config
metadata:
  name: secret
spec:
  path: manifests/tls-secret.yaml
  match: ${image_registry}/${sealos_cloud_image_repository}/sealos-cloud:${sealos_cloud_version}
  strategy: merge
  data: |
    data:
      tls.crt: $tls_crt_base64
      tls.key: $tls_key_base64
"
        # Create tls-secret.yaml file
        echo "$tls_config" > $sealos_cloud_config_dir/tls-secret.yaml
    fi
    print "[Step 2] TLS secret manifest generated: $sealos_cloud_config_dir/tls-secret.yaml"

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
    run_and_log "sealos run --env OPENEBS_USE_LVM=false --env OPENEBS_STORAGE_PREFIX=${openebs_storage} ${image_registry}/${image_repository}/openebs:${openebs_version}"
    run_and_log "sealos run ${image_registry}/${image_repository}/metrics-server:${metrics_server_version}"
    run_and_log "sealos run ${image_registry}/${image_repository}/cockroach:${cockroach_version}"
    run_and_log "sealos run ${image_registry}/${image_repository}/victoria-metrics-k8s-stack:${victoria_metrics_k8s_stack_version}"
    run_and_log "sealos run --env CLOUD_PORT=${sealos_cloud_port} --env CLOUD_DOMAIN=${sealos_cloud_domain} ${image_registry}/${image_repository}/higress:${higress_version}"
    run_and_log "sealos run ${image_registry}/${image_repository}/kubeblocks:${kubeblocks_version}"
    setMongoVersion
    print "[Step 4] Starting Sealos Cloud installation..."
    if [[ -n "$tls_crt_base64" ]] || [[ -n "$tls_key_base64" ]]; then
        run_and_log "sealos run ${image_registry}/${sealos_cloud_image_repository}/sealos-cloud:${sealos_cloud_version} --env cloudDomain=\"${sealos_cloud_domain}\" --env cloudPort=\"${sealos_cloud_port}\" --env mongodbVersion=\"${mongodb_version}\" --config-file $sealos_cloud_config_dir/tls-secret.yaml"
    else
        run_and_log "sealos run ${image_registry}/${sealos_cloud_image_repository}/sealos-cloud:${sealos_cloud_version} --env cloudDomain=\"${sealos_cloud_domain}\" --env cloudPort=\"${sealos_cloud_port}\" --env mongodbVersion=\"${mongodb_version}\""
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
       pull_image "${registry_domain}/${sealos_cloud_image_repository}/${cloudImages[$name]}:${sealos_cloud_version}"
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
              --env databaseLocalCockroachdbURI=\"${varDatabaseGlobalCockroachdbURI}\" \
              --env databaseGlobalCockroachdbURI=\"${varDatabaseLocalCockroachdbURI}\" \
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
            sleep 2
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

    cat << EOF > "$sealos_cloud_config_dir/sealos-document-app.yaml"
apiVersion: app.sealos.io/v1
kind: App
metadata:
  name: sealos-document
  namespace: app-system
spec:
  data:
    desc: Sealos Documents
    url: https://sealos.run/docs/Intro/
  displayType: normal
  i18n:
    zh:
      name: 文档中心
    zh-Hans:
      name: 文档中心
  icon: https://objectstorageapi.cloud.sealos.top/resources/document.svg
  name: Sealos Document
  type: iframe
EOF
    run_and_log "kubectl apply -f $sealos_cloud_config_dir/sealos-document-app.yaml"

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

tls_info(){
    run_and_log "sealos cert --alt-names \"${sealos_cloud_domain}\""
    if [[ "${dry_run,,}" == "true" ]]; then
      print "[Dry Run] Skipping TLS certificate details display."
      return 0
    fi
    print "[Step 5] TLS certificate details:"
    openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text -noout | awk -F', ' '
    {
        for(i=1;i<=NF;i++) {
            if ($i ~ /^DNS:/) {
                gsub(/^DNS:/, "🌐 DNS: ", $i)
                print $i
            }
            else if ($i ~ /^IP Address:/) {
                gsub(/^IP Address:/, "📡 IP:   ", $i)
                print $i
            }
        }
    }'
}

finish_info() {
    if [[ "${dry_run,,}" == "true" ]]; then
      print "[Dry Run] Skipping final installation summary."
      return 0
    fi
    print "Installation complete!"
    print "Kubernetes version: ${kubernetes_version}"
    print "Sealos Cloud version: ${sealos_cloud_version}"
    print "Access URL: https://${sealos_cloud_domain}:${sealos_cloud_port}"
    print "Default admin credentials:"
    print "  Username: admin"
    print "  Password: sealos2023"
}

tls_tips() {
    print "TLS certificate information (important - please review):"
    if [[ -n "${cert_path}" ]] || [[ -n "${key_path}" ]]; then
        print "A custom TLS certificate and private key were provided."
        print "Ensure the DNS name ${sealos_cloud_domain} resolves to this server's IP so the certificate is valid."
        if [[ -f "${sealos_cloud_config_dir}/tls-secret.yaml" ]]; then
            print "TLS secret manifest created at: ${sealos_cloud_config_dir}/tls-secret.yaml"
        fi
        print "If you encounter certificate errors in clients, verify the certificate chain and that the hostname matches."
    else
        print "No TLS certificate provided — a self-signed certificate will be used by Sealos Cloud."
        print "Browsers and clients will show a warning unless the self-signed certificate is trusted."
        print "To trust the certificate, follow the guide: https://sealos.run/docs/self-hosting/install#信任自签名证书"
    fi
}

{
  show_commercial_notice
  proxy_github
  pre_check
  install_pull_images
  prepare_configs
  execute_commands
  run_cloud
  tls_info
  finish_info
  tls_tips
}
