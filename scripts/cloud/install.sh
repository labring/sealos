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
#single=y/n
image_registry=${image_registry:-"docker.io"}
image_repository=${image_repository:-"labring"}
kubernetes_version=${kubernetes_version:-"1.25.6"}
cilium_version=${cilium_version:-"1.12.14"}
cert_manager_version=${cert_manager_version:-"1.8.0"}
helm_version=${helm_version:-"3.12.0"}
openebs_version=${openebs_version:-"3.4.0"}
reflector_version=${reflector_version:-"7.0.151"}
ingress_nginx_version=${ingress_nginx_version:-"1.5.1"}
kubeblocks_version=${kubeblocks_version:-"0.6.2"}
metrics_server_version=${metrics_server_version:-"0.6.4"}


# Define English and Chinese prompts
declare -A PROMPTS_EN PROMPTS_CN

PROMPTS_EN=(
    ["pre_prompt"]="Depends on iptables, please make sure iptables is installed, multi-node needs to configure ssh password-free login or the same password, using self-signed certificate to complete the installation requires self-trust certificate"
    ["pull_image"]="Pulling image: "
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
    ["choose_language"]="Choose prompt language / 选择提示语言:"
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
    ["mongo_avx_requirement"]="MongoDB 5.0 version depends on CPU that supports AVX instruction set, the current environment does not support avx, has been switched to mongo4.0 version, for more information, see:https://www.mongodb.com/docs/v5.0/administration/production-notes/"
    ["usage"]="Usage: $0 [options]

Options:
   --image_registry             # Image registry address (default: docker.io)
   --image_repository           # Image repository name (default: labring)
   --kubernetes_version         # Kubernetes version (default: 1.25.6)
   --cilium_version             # Cilium version (default: 1.12.14)
   --cert_manager_version       # Cert Manager version (default: 1.8.0)
   --helm_version               # Helm version (default: 3.12.0)
   --openebs_version            # OpenEBS version (default: 3.4.0)
   --reflector_version          # Reflector version (default: 7.0.151)
   --ingress_nginx_version      # Ingress Nginx version (default: 1.5.1)
   --kubeblocks_version         # Kubeblocks version (default: 0.6.2)
   --metrics_server_version     # Metrics Server version (default: 0.6.4)
   --cloud_version              # Sealos Cloud version (default: latest)
   --mongodb_version            # MongoDB version (default: mongodb-5.0)
   --master_ips                 # Master node IP list, comma separated (single node and current execution node can be left blank)
   --node_ips                   # Node node IP list, comma separated, can be skipped
   --ssh_private_key            # SSH private key path (default: $HOME/.ssh/id_rsa)
   --ssh_password               # SSH password
   --pod_cidr                   # Pod subnet (default: 100.64.0.0/10)
   --service_cidr               # Service subnet (default: 10.96.0.0/22)
   --cloud_domain               # Cloud domain
   --cloud_port                 # Cloud port (default: 443)
   --cert_path                  # Certificate path
   --key_path                   # Private key path
   --single                     # Whether to install locally: y/n
   --zh                         # Chinese prompt
   --en                         # English prompt
   --help                       # Help information"
)

PROMPTS_CN=(
    ["pre_prompt"]="依赖iptables，请确保iptables已经安装，多节点需要配置ssh免密登录或密码一致, 使用自签证书安装完成后需要自信任证书"
    ["pull_image"]="正在拉取镜像: "
    ["pull_image_success"]="镜像拉取成功: "
    ["pull_image_failed"]="镜像拉取失败: "
    ["install_sealos"]="Sealos CLI没有安装，是否安装？(y/n): "
    ["input_master_ips"]="请输入Master IPs (单节点本地安装可回车跳过该步骤；多个master节点使用逗号分隔, 例: 192.168.0.1,192.168.0.2,192.168.0.3): "
    ["invalid_ips"]="IP无效或没有提供IP，请再试一次。"
    ["input_node_ips"]="请输入Node IPs (多个node节点使用逗号分隔，可跳过): "
    ["pod_subnet"]="请输入pod子网 (回车使用默认值: 100.64.0.0/10): "
    ["service_subnet"]="请输入service子网 (回车使用默认值: 10.96.0.0/22): "
    ["cloud_domain"]="请输入云域名:（例:127.0.0.1.nip.io) "
    ["cloud_port"]="请输入云端口 (回车使用默认值: 443): "
    ["input_certificate"]="是否需要输入证书？(y/n): "
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
    ["mongo_avx_requirement"]="MongoDB 5.0版本依赖支持 AVX 指令集的 CPU，当前环境不支持avx，已切换为mongo4.0版本，更多信息查看:https://www.mongodb.com/docs/v5.0/administration/production-notes/"
    ["usage"]="Usage: $0 [options]=[value] [options]=[value] ...

Options:
   --image_registry             # 镜像仓库地址 (默认: docker.io)
   --image_repository           # 镜像仓库名称 (默认: labring)
   --kubernetes_version         # Kubernetes版本 (默认: 1.25.6)
   --cilium_version             # Cilium版本 (默认: 1.12.14)
   --cert_manager_version       # Cert Manager版本 (默认: 1.8.0)
   --helm_version               # Helm版本 (默认: 3.12.0)
   --openebs_version            # OpenEBS版本 (默认: 3.4.0)
   --reflector_version          # Reflector版本 (默认: 7.0.151)
   --ingress_nginx_version      # Ingress Nginx版本 (默认: 1.5.1)
   --kubeblocks_version         # Kubeblocks版本 (默认: 0.6.2)
   --metrics_server_version     # Metrics Server版本 (默认: 0.6.4)
   --cloud_version              # Sealos Cloud版本 (默认: latest)
   --mongodb_version            # MongoDB版本 (默认: mongodb-5.0)
   --master_ips                 # Master节点IP列表,使用英文逗号分割 (单节点且为当前执行节点可不填写)
   --node_ips                   # Node节点IP列表,使用英文逗号分割
   --ssh_private_key            # SSH私钥路径 (默认: $HOME/.ssh/id_rsa)
   --ssh_password               # SSH密码
   --pod_cidr                   # Pod子网 (默认: 100.64.0.0/10)
   --service_cidr               # Service子网 (默认: 10.96.0.0/22)
   --cloud_domain               # 云域名
   --cloud_port                 # 云端口 (默认: 443)
   --cert_path                  # 证书路径
   --key_path                   # 私钥路径
   --single                     # 是否本地安装 (y/n)
   --zh                         # 中文提示
   --en                         # 英文提示
   --help                       # 帮助信息"
)

# Choose Language
get_prompt() {
    local key="$1"
    local inline="$2"
    local prompts=""
    if [[ $LANGUAGE == "CN" ]]; then
        prompts="${PROMPTS_CN[$key]}"
    else
        prompts="${PROMPTS_EN[$key]}"
    fi
    if [[ -n "$inline" ]]; then
        echo -ne "$prompts"
    else
        echo -e "$prompts"
    fi
}

set_language() {
  if [[ $LANGUAGE == "" ]]; then
      get_prompt "choose_language"
      echo "1. English"
      echo "2. 中文"
      get_prompt "enter_choice"
      read -p " " lang_choice
      if [[ $lang_choice == "2" ]]; then
          LANGUAGE="CN"
      fi
  fi
  if [[ $LANGUAGE != "CN" ]]; then
      LANGUAGE="EN"
  fi
}

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
    echo ""
    pull_image "kubernetes" "v${kubernetes_version#v:-1.25.6}"
    pull_image "cilium" "v${cilium_version#v:-1.12.14}"
    pull_image "cert-manager" "v${cert_manager_version#v:-1.8.0}"
    pull_image "helm" "v${helm_version#v:-3.12.0}"
    pull_image "openebs" "v${openebs_version#v:-3.4.0}"
    pull_image "ingress-nginx" "v${ingress_nginx_version#v:-1.5.1}"
    pull_image "kubeblocks" "v${kubeblocks_version#v:-0.6.2}"
    pull_image "metrics-server" "v${metrics_server_version#v:-0.6.4}"
    pull_image "kubernetes-reflector" "v${reflector_version#v:-7.0.151}"
    pull_image "sealos-cloud" "${CLOUD_VERSION}"
}

pull_image() {
  image_name=$1
  image_version=$2
  inline="y"

  echo -ne "\033[1F\033[2K"
  get_prompt "pull_image" $inline && echo "$image_name:$image_version"
  sealos pull -q "${image_registry}/${image_repository}/${image_name}:${image_version}" >/dev/null
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
    if [[ $single != "y" && $master_ips == "" ]]; then
        while :; do
            read -p "$(get_prompt "input_master_ips")" master_ips
            if validate_ips "$master_ips"; then
                if [[ -z "$master_ips" ]]; then
                    single="y"
                fi
                break
            else
                get_prompt "invalid_ips"
            fi
        done
    fi
    if [[ $single != "y" ]]; then
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

    [[ $pod_cidr != "" ]] || read -p "$(get_prompt "pod_subnet")" pod_cidr

    [[ $service_cidr != "" ]] || read -p "$(get_prompt "service_subnet")" service_cidr

    [[ $cloud_domain != "" ]] || read -p "$(get_prompt "cloud_domain")" cloud_domain

    [[ $cloud_port != "" ]] || read -p "$(get_prompt "cloud_port")" cloud_port

    [[ $input_cert != "" || ($cert_path != "" && $key_path != "") ]] || read -p "$(get_prompt "input_certificate")" input_cert

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
  match: ${image_registry}/${image_repository}/sealos-cloud:latest
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
  match: ${image_registry}/${image_repository}/ingress-nginx:v${ingress_nginx_version#v:-1.5.1}
  path: charts/ingress-nginx/values.yaml
  strategy: merge
"
    echo "$ingress_config" > $CLOUD_DIR/ingress-nginx-config.yaml

    sealos_gen_cmd="sealos gen ${image_registry}/${image_repository}/kubernetes:v${kubernetes_version#v:-1.25.6}\
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
    kubectl get no > /dev/null 2>&1 || (get_prompt "k8s_installation" && sealos apply -f $CLOUD_DIR/Clusterfile)
    command -v helm > /dev/null 2>&1 || sealos run "${image_registry}/${image_repository}/helm:v${helm_version#v:-3.12.0}"
    get_prompt "cilium_requirement"
    if kubectl get no | grep NotReady > /dev/null 2>&1; then
      sealos run "${image_registry}/${image_repository}/cilium:v${cilium_version#v:-1.12.14}"
    fi
    wait_cluster_ready
    sealos run "${image_registry}/${image_repository}/cert-manager:v${cert_manager_version#v:-1.8.0}"
    sealos run "${image_registry}/${image_repository}/openebs:v${openebs_version#v:-3.4.0}"
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
    sealos run ${image_registry}/${image_repository}/kubernetes-reflector:v${reflector_version#v:-7.0.151}\
        ${image_registry}/${image_repository}/ingress-nginx:v${ingress_nginx_version#v:-1.5.1}\
        ${image_registry}/${image_repository}/kubeblocks:v${kubeblocks_version#v:-0.6.2}\
        --config-file $CLOUD_DIR/ingress-nginx-config.yaml

    sealos run "${image_registry}/${image_repository}/metrics-server:v${metrics_server_version#v:-0.6.4}"

    get_prompt "patching_ingress"
    kubectl -n ingress-nginx patch ds ingress-nginx-controller -p '{"spec":{"template":{"spec":{"tolerations":[{"key":"node-role.kubernetes.io/control-plane","operator":"Exists","effect":"NoSchedule"}]}}}}'

    get_prompt "installing_cloud"

    setMongoVersion
    if [[ -n "$tls_crt_base64" ]] || [[ -n "$tls_key_base64" ]]; then
        sealos run ${image_registry}/${image_repository}/sealos-cloud:latest\
        --env cloudDomain="$cloud_domain"\
        --env cloudPort="${cloud_port:-443}"\
        --env mongodbVersion="${mongodb_version:-mongodb-5.0}"\
        --config-file $CLOUD_DIR/tls-secret.yaml
    else
        sealos run ${image_registry}/${image_repository}/sealos-cloud:latest\
        --env cloudDomain="$cloud_domain"\
        --env cloudPort="${cloud_port:-443}"\
        --env mongodbVersion="${mongodb_version:-mongodb-5.0}"
    fi
}

for i in "$@"; do
  case ${i,,} in
  --image_registry=*) image_registry="${i#*=}"; shift ;;
  --image_repository=*) image_repository="${i#*=}"; shift ;;
  --kubernetes_version=*) kubernetes_version="${i#*=}"; shift ;;
  --cilium_version=*) cilium_version="${i#*=}"; shift ;;
  --cert_manager_version=*) cert_manager_version="${i#*=}"; shift ;;
  --helm_version=*) helm_version="${i#*=}"; shift ;;
  --openebs_version=*) openebs_version="${i#*=}"; shift ;;
  --reflector_version=*) reflector_version="${i#*=}"; shift ;;
  --ingress_nginx_version=*) ingress_nginx_version="${i#*=}"; shift ;;
  --kubeblocks_version=*) kubeblocks_version="${i#*=}"; shift ;;
  --metrics_server_version=*) metrics_server_version="${i#*=}"; shift ;;
  --cloud_version=*) CLOUD_VERSION="${i#*=}"; shift ;;
  --mongodb_version=*) mongodb_version="${i#*=}"; shift ;;
  --master_ips=*) master_ips="${i#*=}"; shift ;;
  --node_ips=*) node_ips="${i#*=}"; shift ;;
  --ssh_private_key=*) ssh_private_key="${i#*=}"; shift ;;
  --ssh_password=*) ssh_password="${i#*=}"; shift ;;
  --pod_cidr=*) pod_cidr="${i#*=}"; shift ;;
  --service_cidr=*) service_cidr="${i#*=}"; shift ;;
  --cloud_domain=*) cloud_domain="${i#*=}"; shift ;;
  --cloud_port=*) cloud_port="${i#*=}"; shift ;;
  --cert_path=*) cert_path="${i#*=}"; shift ;;
  --key_path=*) key_path="${i#*=}"; shift ;;
  --single) single="y"; shift ;;
  --zh | zh ) LANGUAGE="CN"; shift ;;
  --en | en ) LANGUAGE="EN"; shift ;;
  -c | --config) source ${i#*=} > /dev/null; shift ;;
  -h | --help) HELP=true; shift ;;
  -d | --debug) set -x; shift ;;
  -*) echo "Unknown option $i"; exit 1 ;;
  *) ;;
  esac
done

[[ $HELP == "" ]] || get_prompt "usage"
[[ $HELP == "" ]] || exit 0
set_language
init
collect_input
prepare_configs
execute_commands

GREEN='\033[0;32m'
BOLD='\033[1m'
RESET='\033[0m'

echo -e "${BOLD}Sealos cloud login info:${RESET}\nCloud Version: ${GREEN}${CLOUD_VERSION}${RESET}\nURL: ${GREEN}https://$cloud_domain${cloud_port:+:$cloud_port}${RESET}\nadmin Username: ${GREEN}admin${RESET}\nadmin Password: ${GREEN}sealos2023${RESET}"