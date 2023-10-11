#!/bin/bash

set -e

# Configurations
CLOUD_DIR="/root/.sealos/cloud"
SEALOS_VERSION="v4.3.4"
CLOUD_VERSION="v0.0.1"

# Define English and Chinese prompts
declare -A PROMPTS_EN PROMPTS_CN

PROMPTS_EN=(
    ["install_sealos"]="Sealos CLI is not installed. Do you want to install it now? (y/n): "
    ["input_master_ips"]="Please enter Master IPs (comma separated, at least one required): "
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
    ["patching_ingress"]="Patching ingress-nginx-controller tolerations to allow it to run on master node. If you don't want it to run on master node, please skip this step."
    ["installing_cloud"]="Installing sealos cloud."
    ["avx_not_supported"]="CPU does not support AVX instructions"
    ["ssh_private_key"]="Please configure the ssh private key path, press Enter to use the default value '/root/.ssh/id_rsa' "
    ["ssh_password"]="Please enter the ssh password, press Enter to skip\n"
)

PROMPTS_CN=(
    ["install_sealos"]="Sealos CLI没有安装，是否安装？(y/n): "
    ["input_master_ips"]="请输入Master IPs (多个master节点使用逗号分隔, 例：192.168.0.1,192.168.0.2,192.168.0.3) \n"
    ["invalid_ips"]="IP无效或没有提供IP，请再试一次。"
    ["input_node_ips"]="请输入Node IPs (多个node节点使用逗号分隔，可跳过): "
    ["pod_subnet"]="请输入pod子网 (回车使用默认值: 100.64.0.0/10): "
    ["service_subnet"]="请输入service子网 (回车使用默认值: 10.96.0.0/22): "
    ["cloud_domain"]="请输入云域名：（例：127.0.0.1.nip.io) \n "
    ["cloud_port"]="请输入云端口 (回车使用默认值: 443): "
    ["input_certificate"]="您要输入证书吗？(y/n): "
    ["certificate_path"]="请输入证书路径: "
    ["private_key_path"]="请输入私钥路径: "
    ["choose_language"]="选择语言:"
    ["enter_choice"]="请输入您的选择 (1/2): "
    ["k8s_installation"]="正在安装Kubernetes集群。"
    ["ingress_installation"]="正在安装ingress-nginx-controller和kubeblocks。"
    ["patching_ingress"]="正在修改ingress-nginx-controller的容忍度，以允许它在主节点上运行。如果您不希望它在主节点上运行，请跳过此步骤。"
    ["installing_cloud"]="正在安装sealos cloud。"
    ["avx_not_supported"]="CPU不支持AVX指令"
    ["ssh_private_key"]="如需免密登录请配置ssh私钥路径，回车使用默认值'/root/.ssh/id_rsa' "
    ["ssh_password"]="请输入ssh密码，配置免密登录可回车跳过\n"
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

if [[ $lang_choice == "2" ]]; then
    LANGUAGE="CN"
else
    LANGUAGE="EN"
fi

#TODO check if CPU supports AVX instructions
#precheck() {
#  cat /proc/cpuinfo | grep avx
#  if [ $? -ne 0 ]; then
#    get_prompt "avx_not_supported"
#    exit 1
#  fi
#}

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
    while :; do
        read -p "$(get_prompt "input_master_ips")" masterIps
        if validate_ips "$masterIps" && [[ ! -z "$masterIps" ]]; then
            break
        else
            get_prompt "invalid_ips"
        fi
    done
    while :; do
        read -p "$(get_prompt "input_node_ips")" nodeIps
        if validate_ips "$nodeIps"; then
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
    read -p "$(get_prompt "pod_subnet")" podCidr
    read -p "$(get_prompt "service_subnet")" serviceCidr
    read -p "$(get_prompt "cloud_domain")" cloudDomain
    read -p "$(get_prompt "cloud_port")" cloudPort
    read -p "$(get_prompt "input_certificate")" inputCert
    if [[ $inputCert == "y" || $inputCert == "Y" ]]; then
        read -p "$(get_prompt "certificate_path")" certPath
        read -p "$(get_prompt "private_key_path")" keyPath
    fi
}

prepare_configs() {
    if [[ $inputCert == "y" || $inputCert == "Y" ]]; then
        # Convert certificate and key to base64
        tls_crt_base64=$(cat $certPath | base64 | tr -d '\n')
        tls_key_base64=$(cat $keyPath | base64 | tr -d '\n')

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
  match: docker.io/labring/ingress-nginx:v1.5.1
  path: charts/ingress-nginx/values.yaml
  strategy: merge
"
    echo "$ingress_config" > $CLOUD_DIR/ingress-nginx-config.yaml

    sealos_gen_cmd="sealos gen labring/kubernetes:v1.25.6\
        labring/helm:v3.12.0\
        labring/cilium:v1.12.14\
        labring/cert-manager:v1.8.0\
        labring/openebs:v3.4.0\
        --masters $masterIps\
        --pk=${ssh_private_key}\
        --passwd=${ssh_password}\
        "

    if [ -n "$nodeIps" ]; then
        sealos_gen_cmd+=" --nodes $nodeIps"
    fi

    $sealos_gen_cmd > $CLOUD_DIR/Clusterfile

    # Modify Clusterfile with sed
    sed -i "s|100.64.0.0/10|${podCidr:-100.64.0.0/10}|g" $CLOUD_DIR/Clusterfile
    sed -i "s|10.96.0.0/22|${serviceCidr:-10.96.0.0/22}|g" $CLOUD_DIR/Clusterfile
}

execute_commands() {
    get_prompt "k8s_installation"
    sealos apply -f $CLOUD_DIR/Clusterfile

    get_prompt "ingress_installation"
    sealos run docker.io/labring/kubernetes-reflector:v7.0.151\
        docker.io/labring/ingress-nginx:v1.5.1\
        docker.io/labring/kubeblocks:v0.6.2\
        --config-file $CLOUD_DIR/ingress-nginx-config.yaml

    get_prompt "patching_ingress"
    kubectl -n ingress-nginx patch ds ingress-nginx-controller -p '{"spec":{"template":{"spec":{"tolerations":[{"key":"node-role.kubernetes.io/control-plane","operator":"Exists","effect":"NoSchedule"}]}}}}'

    get_prompt "installing_cloud"
    if [[ $inputCert == "y" || $inputCert == "Y" ]]; then
        sealos run docker.io/labring/sealos-cloud:latest\
        --env cloudDomain="$cloudDomain"\
        --env cloudPort="${cloudPort:-443}"\
        --config-file $CLOUD_DIR/tls-secret.yaml
    else
        sealos run docker.io/labring/sealos-cloud:latest\
        --env cloudDomain="$cloudDomain"\
        --env cloudPort="${cloudPort:-443}"
    fi
}

# Main script execution
init
collect_input
prepare_configs
execute_commands

GREEN='\033[0;32m'
BOLD='\033[1m'
RESET='\033[0m'

echo -e "${BOLD}Sealos cloud login info:${RESET}\nCloud Version: ${GREEN}${CLOUD_VERSION}${RESET}\nURL: ${GREEN}https://$cloudDomain:$cloudPort${RESET}\nadmin Username: ${GREEN}admin${RESET}\nadmin Password: ${GREEN}sealos2023${RESET}"