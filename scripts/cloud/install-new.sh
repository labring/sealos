#!/bin/bash

set -e

###
kubernetes_version="v1.28.15"
cilium_version="v1.15.8"
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


export image_repository="cuisongliu/sealos"
export sealos_cloud_image_repository="labring"
export sealos_cloud_version="latest"
export sealos_cloud_config_dir="/root/.sealos/cloud"
export sealos_cli_version="v5.0.1"
export github_use_proxy="false"

export max_pod="120"
export openebs_storage="/var/openebs"
export containerd_storage="/var/lib/containerd"
export pod_cidr="100.64.0.0/10"
export service_cidr="10.96.0.0/22"
export cert_path=""
export key_path=""

export master_ips="192.168.64.4:22"
export node_ips=""
export ssh_private_key="$HOME/.ssh/id_rsa"
export ssh_password=""
export sealos_exec_debug="false"
export sealos_cloud_port="443"
export sealos_cloud_domain="192.168.64.4.nip.io"

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
  dbg="${dbg,,}"  # 转小写
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
  if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root. Please re-run as root or with sudo."
  fi
  if [[ "$(uname -s)" != "Linux" ]]; then
    error "This script only supports Linux."
  fi
  for cmd in curl iptables; do
    if ! command -v $cmd &>/dev/null; then
      error "The $cmd is not installed. Please install $cmd and re-run the script."
    fi
  done
  if ! command -v lvm &>/dev/null; then
    warn "Warning: lvm is not installed. Some commercial features (such as upgrades) may be unavailable."
  fi
  arch=$(uname -m)
  if [[ "$arch" != "x86_64" && "$arch" != "aarch64" ]]; then
    error "Host CPU architecture must be AMD64 (x86_64) or AArch64 (aarch64). Current: $arch"
  fi
  kernel_full=$(uname -r)
  if [ "$(ver_ge "$kernel_full" "4.19.57")" -ne 0 ]; then
    if [[ "$kernel_full" != *"el8"* && "$kernel_full" != *"el9"* ]]; then
      error "Linux kernel must be >= 4.19.57 or an equivalent supported version (for example RHEL8's 4.18). Current: $kernel_full"
    fi
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
        --env criData=${containerd_storage}\
        --pk=${ssh_private_key:-$HOME/.ssh/id_rsa}\
        --passwd=${ssh_password}"

}
execute_commands() {
    print "[Step 3] Starting Kubernetes and core components installation; kubernetes status: ${k8s_installed}..."
    [[ $k8s_installed == "y" ]] || run_and_log "$sealos_init_cmd"
    run_and_log "sealos run ${image_registry}/${image_repository}/helm:${helm_version}"
    [[ $k8s_ready == "y" ]] || run_and_log "sealos run ${image_registry}/${image_repository}/cilium:${cilium_version} --env ExtraValues=\"ipam.mode=kubernetes\""
    wait_cluster_ready
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
        run_and_log "sealos run ${image_registry}/${sealos_cloud_image_repository}/sealos-cloud:${sealos_cloud_version} --env cloudDomain=\"${sealos_cloud_domain}\" --env cloudPort=\"${sealos_cloud_port}\" --env mongodbVersion=\"${mongodb_version}\" --config-file $sealos_cloud_config_dir/tls-secret.yaml --env loggerfile=$sealos_cloud_config_dir/sealos-cloud-install.log"
    else
        run_and_log "sealos run ${image_registry}/${sealos_cloud_image_repository}/sealos-cloud:${sealos_cloud_version} --env cloudDomain=\"${sealos_cloud_domain}\" --env cloudPort=\"${sealos_cloud_port}\" --env mongodbVersion=\"${mongodb_version}\" --env loggerfile=$sealos_cloud_config_dir/sealos-cloud-install.log "
    fi
    run_and_log "sealos cert --alt-names \"${sealos_cloud_domain}\""
}
finish_info() {
    print "Installation complete!"
    print "Kubernetes version: ${kubernetes_version}"
    print "Sealos Cloud version: ${sealos_cloud_version}"
    print "Access URL: https://${sealos_cloud_domain}:${sealos_cloud_port}"
    print "Default admin credentials:"
    print "  Username: admin"
    print "  Password: sealos2023"
}

{
  show_commercial_notice
  proxy_github
  pre_check
  install_pull_images
  prepare_configs
  execute_commands
  finish_info
}
