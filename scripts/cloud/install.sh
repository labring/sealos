#!/bin/bash

set -e

# Configurations
CLOUD_DIR="/root/.sealos/cloud"
SEALOS_VERSION="v4.3.5"
CLOUD_VERSION="latest"
#mongodb_version="mongodb-5.0"
#master_ips=
#node_ips=
#ssh_private_key=
#ssh_password=
#pod_cidr=
#service_cidr=
#cloud_domain=
#cloud_port=
#input_cert=
#cert_path=
#key_path=
#local_install=y/n
kubernetes_version=1.25.6
cilium_version=1.12.14
cert_manager_version=1.8.0
helm_version=3.12.0
openebs_version=3.4.0
reflector_version=7.0.151
ingress_nginx_version=1.5.1
kubeblocks_version=0.6.2
metrics_server_version=0.6.4


# Define English and Chinese prompts
declare -A PROMPTS_EN PROMPTS_CN

PROMPTS_EN=(
    ["pre_prompt"]="Depends on iptables, please make sure iptables is installed, multi-node needs to configure ssh password-free login or the same password, using self-signed certificate to complete the installation requires self-trust certificate"
    ["pull_image"]="Pulling images"
    ["install_sealos"]="Sealos CLI is not installed. Do you want to install it now? (y/n): "
    ["input_master_ips"]="Please enter Master IPs (press Enter to skip this step for local installation; comma separated for multiple master nodes, e.g: 192.168.0.1,192.168.0.2,192.168.0.3)"
    ["invalid_ips"]="Invalid IPs or no IPs provided. Please try again."
    ["input_node_ips"]="Please enter Node IPs (comma separated, leave empty if none): "
    ["pod_subnet"]="Please enter pod subnet (default: 100.64.0.0/10): "
    ["service_subnet"]="Please enter service subnet (default: 10.96.0.0/22): "
    ["cloud_domain"]="Please enter cloud domain: "
    ["cloud_port"]="Please enter cloud port (default: 443): "
    ["input_certificate"]="Do you want to input a certificate? (y/n): "
    ["certificate_path"]="Please input the certificate path: "
    ["private_key_path"]="Please input the private key path: "
    ["choose_language"]="Choose language / 选择语言:"
    ["enter_choice"]="Enter your choice (1/2): "
    ["k8s_installation"]="Installing Kubernetes cluster."
    ["ingress_installation"]="Installing ingress-nginx-controller and kubeblocks."
    ["patching_ingress"]="Patching ingress-nginx-controller tolerations to allow it to run on master node."
    ["installing_cloud"]="Installing sealos cloud."
    ["avx_not_supported"]="CPU does not support AVX instructions"
    ["ssh_private_key"]="Please configure the ssh private key path, press Enter to use the default value '/root/.ssh/id_rsa' "
    ["ssh_password"]="Please enter the ssh password, press Enter to skip\n"
    ["wait_cluster_ready"]="Waiting for cluster to be ready, if you want to skip this step, please enter '1'"
    ["cilium_requirement"]="When running Cilium using the container image cilium/cilium, the host system must meet these requirements:
Hosts with either AMD64 or AArch64 architecture
Linux kernel >= 4.19.57 or equivalent (e.g., 4.18 on RHEL8)"
    ["mongo_avx_requirement"]="MongoDB 5.0 version depends on CPU that supports AVX instruction set, the current environment does not support avx, so only mongo4.0 version can be used. For more information, see: https://www.mongodb.com/docs/v5.0/administration/production-notes/"
)

PROMPTS_CN=(
    ["pre_prompt"]="依赖iptables，请确保iptables已经安装，多节点需要配置ssh免密登录或密码一致, 使用自签证书安装完成后需要自信任证书"
    ["pull_image"]="正在拉取镜像"
    ["install_sealos"]="Sealos CLI没有安装，是否安装？(y/n): "
    ["input_master_ips"]="请输入Master IPs (单节点本地安装可回车跳过该步骤；多个master节点使用逗号分隔, 例: 192.168.0.1,192.168.0.2,192.168.0.3): "
    ["invalid_ips"]="IP无效或没有提供IP，请再试一次。"
    ["input_node_ips"]="请输入Node IPs (多个node节点使用逗号分隔，可跳过): "
    ["pod_subnet"]="请输入pod子网 (回车使用默认值: 100.64.0.0/10): "
    ["service_subnet"]="请输入service子网 (回车使用默认值: 10.96.0.0/22): "
    ["cloud_domain"]="请输入云域名:（例:127.0.0.1.nip.io) "
    ["cloud_port"]="请输入云端口 (回车使用默认值: 443): "
    ["input_certificate"]="请输入证书吗？(y/n): "
    ["certificate_path"]="请输入证书路径: "
    ["private_key_path"]="请输入私钥路径: "
    ["choose_language"]="请选择语言:"
    ["enter_choice"]="请输入您的选择 (1/2): "
    ["k8s_installation"]="正在安装Kubernetes集群。"
    ["ingress_installation"]="正在安装ingress-nginx-controller和kubeblocks。"
    ["patching_ingress"]="正在修改ingress-nginx-controller的容忍度，以允许它在主节点上运行。"
    ["installing_cloud"]="正在安装sealos cloud。"
    ["avx_not_supported"]="CPU不支持AVX指令"
    ["ssh_private_key"]="如需免密登录请配置ssh私钥路径，回车使用默认值'/root/.ssh/id_rsa' "
    ["ssh_password"]="请输入ssh密码，配置免密登录可回车跳过"
    ["wait_cluster_ready"]="正在等待集群就绪, 如果您想跳过此步骤，请输入'1'"
    ["cilium_requirement"]="正在使用Cilium作为网络插件，主机系统必须满足以下要求:
具有AMD64或AArch64架构的主机
Linux内核> = 4.19.57或等效版本（例如，在RHEL8上为4.18）"
    ["mongo_avx_requirement"]="MongoDB 5.0版本依赖支持 AVX 指令集的 CPU，当前环境不支持avx，所以仅可使用mongo4.0版本，更多信息查看:https://www.mongodb.com/docs/v5.0/administration/production-notes/"
)

# Choose Language
get_prompt() {
    local key="$1"
    if [[ $LANGUAGE == "CN" ]]; then
        echo -e "${PROMPTS_CN[$key]}"
    else
        echo -e "${PROMPTS_EN[$key]}"
    fi
}

get_prompt "choose_language"
echo "1. English"
echo "2. 中文"
read -p "$(get_prompt "enter_choice")" lang_choice
echo -ne "\033[4F\033[2K"

if [[ $lang_choice == "2" ]]; then
    LANGUAGE="CN"
else
    LANGUAGE="EN"
fi

#TODO mongo 5.0 need avx support, if not support, change to 4.0
setMongoVersion() {
  set +e
  grep avx /proc/cpuinfo > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    get_prompt "mongo_avx_requirement"
    mongodb_version="mongodb-4.0"
  fi
  set -e
}

# Initialization
init() {
    mkdir -p $CLOUD_DIR

    # Check for sealos CLI
    if ! command -v sealos &> /dev/null; then
        get_prompt "install_sealos"
        read -p " " installChoice
        if [[ $installChoice == "y" || $installChoice == "Y" ]]; then
            curl -sfL https://raw.githubusercontent.com/labring/sealos/${SEALOS_VERSION}/scripts/install.sh |
              sh -s ${SEALOS_VERSION} labring/sealos
        else
            echo "Please install sealos CLI to proceed."
            exit 1
        fi
    else
        echo "Sealos CLI is already installed."
    fi

    get_prompt "pre_prompt"
    get_prompt "pull_image"
    sealos pull -q docker.io/labring/kubernetes:v${kubernetes_version#v:-1.25.6} >/dev/null
    sealos pull -q docker.io/labring/cilium:v${cilium_version#v:-1.12.14} >/dev/null
    sealos pull -q docker.io/labring/cert-manager:v${cert_manager_version#v:-1.8.0} >/dev/null
    sealos pull -q docker.io/labring/helm:v${helm_version#v:-3.12.0} >/dev/null
    sealos pull -q docker.io/labring/openebs:v${openebs_version#v:-3.4.0} >/dev/null
    sealos pull -q docker.io/labring/ingress-nginx:v${ingress_nginx_version#v:-1.5.1} >/dev/null
    sealos pull -q docker.io/labring/kubeblocks:v${kubeblocks_version#v:-0.6.2} >/dev/null
    sealos pull -q docker.io/labring/metrics-server:v${metrics_server_version#v:-0.6.4} >/dev/null
    sealos pull -q docker.io/labring/kubernetes-reflector:v${reflector_version#v:-7.0.151} >/dev/null
    sealos pull -q docker.io/labring/sealos-cloud:${CLOUD_VERSION} >/dev/null
}

collect_input() {
    # Utility function to validate IP address
    validate_ips() {
        local ips="$1"
        for ip in $(echo "$ips" | tr ',' ' '); do
            if ! [[ $ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                return 1
            fi
        done
        return 0
    }

    # Master and Node IPs
    if [[ $local_install != "y" ]]; then
        while :; do
            read -p "$(get_prompt "input_master_ips")" master_ips
            if validate_ips "$master_ips"; then
                if [[ -z "$master_ips" ]]; then
                    local_install="y"
                fi
                break
            else
                get_prompt "invalid_ips"
            fi
        done
    fi
    if [[ $local_install != "y" ]]; then
        while :; do
            read -p "$(get_prompt "input_node_ips")" node_ips
            if validate_ips "$node_ips"; then
                break
            else
                get_prompt "invalid_ips"
            fi
        done
        read -p "$(get_prompt "ssh_private_key")" ssh_private_key

        if [[ -z "$ssh_private_key" ]]; then
            ssh_private_key="${HOME}/.ssh/id_rsa"
        fi
        read -p "$(get_prompt "ssh_password")" ssh_password

    fi

    read -p "$(get_prompt "pod_subnet")" pod_cidr

    read -p "$(get_prompt "service_subnet")" service_cidr

    read -p "$(get_prompt "cloud_domain")" cloud_domain

    read -p "$(get_prompt "cloud_port")" cloud_port

    read -p "$(get_prompt "input_certificate")" input_cert

    if [[ $input_cert == "y" || $input_cert == "Y" ]]; then
        read -p "$(get_prompt "certificate_path")" cert_path

        read -p "$(get_prompt "private_key_path")" key_path

    fi
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
  match: docker.io/labring/sealos-cloud:latest
  strategy: merge
  data: |
    data:
      tls.crt: $tls_crt_base64
      tls.key: $tls_key_base64
"
        # Create tls-secret.yaml file
        echo "$tls_config" > $CLOUD_DIR/tls-secret.yaml
    fi

    ingress_config="
apiVersion: apps.sealos.io/v1beta1
kind: Config
metadata:
  creationTimestamp: null
  name: ingress-nginx-config
spec:
  data: |
    controller:
      hostNetwork: true
      kind: DaemonSet
      service:
        type: NodePort
  match: docker.io/labring/ingress-nginx:v${ingress_nginx_version#v:-1.5.1}
  path: charts/ingress-nginx/values.yaml
  strategy: merge
"
    echo "$ingress_config" > $CLOUD_DIR/ingress-nginx-config.yaml

    sealos_gen_cmd="sealos gen labring/kubernetes:v${kubernetes_version#v:-1.25.6}\
        ${master_ips:+--masters $master_ips}\
        ${node_ips:+--nodes $node_ips}\
        --pk=${ssh_private_key:-$HOME/.ssh/id_rsa}\
        --passwd=${ssh_password} -o $CLOUD_DIR/Clusterfile"

    command -v kubelet > /dev/null 2>&1 || $sealos_gen_cmd

    # Modify Clusterfile with sed
    sed -i "s|100.64.0.0/10|${pod_cidr:-100.64.0.0/10}|g" $CLOUD_DIR/Clusterfile
    sed -i "s|10.96.0.0/22|${service_cidr:-10.96.0.0/22}|g" $CLOUD_DIR/Clusterfile
}

wait_cluster_ready() {
    local prompt_msg=$(get_prompt "wait_cluster_ready")
    while true; do
        if kubectl get nodes | grep "NotReady" &> /dev/null; then
          loading_animation "$prompt_msg"
        else
          echo && break # new line
        fi
        read -t 1 -n 1 -p "" input 2>/dev/null || true
        if [[ "$input" == "1" ]]; then
          echo && break # new line
        fi
    done
}

loading_animation() {
    local message="$1"
    local duration="${2:-0.5}"

    echo -ne "\r$message   \e[K"
    sleep "$duration"
    echo -ne "\r$message .  \e[K"
    sleep "$duration"
    echo -ne "\r$message .. \e[K"
    sleep "$duration"
    echo -ne "\r$message ...\e[K"
    sleep "$duration"
}

execute_commands() {
    command -v kubelet > /dev/null 2>&1 || (get_prompt "k8s_installation" && sealos apply -f $CLOUD_DIR/Clusterfile)
    command -v helm > /dev/null 2>&1 || sealos run "labring/helm:v${helm_version#v:-3.12.0}"
    get_prompt "cilium_requirement"
    if kubectl get no | grep NotReady > /dev/null 2>&1; then
      sealos run "labring/cilium:v${cilium_version#v:-1.12.14}"
    fi
    wait_cluster_ready
    sealos run "labring/cert-manager:v${cert_manager_version#v:-1.8.0}"
    sealos run "labring/openebs:v${openebs_version#v:-3.4.0}"
    kubectl get sc openebs-backup > /dev/null 2>&1 || kubectl create -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-backup
provisioner: openebs.io/local
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
EOF

    get_prompt "ingress_installation"
    sealos run docker.io/labring/kubernetes-reflector:v${reflector_version#v:-7.0.151}\
        docker.io/labring/ingress-nginx:v${ingress_nginx_version#v:-1.5.1}\
        docker.io/labring/kubeblocks:v${kubeblocks_version#v:-0.6.2}\
        --config-file $CLOUD_DIR/ingress-nginx-config.yaml

    sealos run "labring/metrics-server:v${metrics_server_version#v:-0.6.4}"

    get_prompt "patching_ingress"
    kubectl -n ingress-nginx patch ds ingress-nginx-controller -p '{"spec":{"template":{"spec":{"tolerations":[{"key":"node-role.kubernetes.io/control-plane","operator":"Exists","effect":"NoSchedule"}]}}}}'

    get_prompt "installing_cloud"

    setMongoVersion
    if [[ -n "$tls_crt_base64" ]] || [[ -n "$tls_key_base64" ]]; then
        sealos run docker.io/labring/sealos-cloud:latest\
        --env cloudDomain="$cloud_domain"\
        --env cloudPort="${cloud_port:-443}"\
        --env mongodbVersion="${mongodb_version:-mongodb-5.0}"\
        --config-file $CLOUD_DIR/tls-secret.yaml
    else
        sealos run docker.io/labring/sealos-cloud:latest\
        --env cloudDomain="$cloud_domain"\
        --env cloudPort="${cloud_port:-443}"\
        --env mongodbVersion="${mongodb_version:-mongodb-5.0}"
    fi
}

# Main script execution
init
source $1 > /dev/null 2>&1 || collect_input
prepare_configs
execute_commands

GREEN='\033[0;32m'
BOLD='\033[1m'
RESET='\033[0m'

echo -e "${BOLD}Sealos cloud login info:${RESET}\nCloud Version: ${GREEN}${CLOUD_VERSION}${RESET}\nURL: ${GREEN}https://$cloud_domain${cloud_port:+:$cloud_port}${RESET}\nadmin Username: ${GREEN}admin${RESET}\nadmin Password: ${GREEN}sealos2023${RESET}"