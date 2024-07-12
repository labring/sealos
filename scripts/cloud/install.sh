#!/bin/bash

set -e

# Configurations
CLOUD_DIR="/root/.sealos/cloud"
SEALOS_VERSION="v5.0.0"
cloud_version="latest"
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
kubernetes_version=${kubernetes_version:-"1.27.11"}
cilium_version=${cilium_version:-"1.14.8"}
cert_manager_version=${cert_manager_version:-"1.14.6"}
helm_version=${helm_version:-"3.14.1"}
openebs_version=${openebs_version:-"3.10.0"}
ingress_nginx_version=${ingress_nginx_version:-"1.9.4"}
kubeblocks_version=${kubeblocks_version:-"0.8.2"}
metrics_server_version=${metrics_server_version:-"0.6.4"}
victoria_metrics_k8s_stack_version=${victoria_metrics_k8s_stack_version:-"1.96.0"}


# Define English and Chinese prompts
declare -A PROMPTS_EN PROMPTS_CN

PROMPTS_EN=(
    ["pre_prompt"]="Depends on iptables, please make sure iptables is installed, multiple nodes need to configure ssh password-free login or the same password, after installation with the self-signed certificate provided by Sealos, you need to trust the certificate yourself."
    ["pull_image"]="Pulling image: "
    ["pull_image_success"]="Image pulled successfully: "
    ["pull_image_failed"]="Image pull failed: "
    ["install_sealos"]="Sealos CLI is not installed, do you want to install it? (y/n): "
    ["input_master_ips"]="Please enter Master IP (For single node installation, you can press enter to skip this step; separate multiple Master nodes with commas, e.g: 192.168.0.1,192.168.0.2,192.168.0.3): "
    ["invalid_ips"]="Invalid or incorrect IP format, please try again."
    ["input_node_ips"]="Please enter Node IP (If there are no Node nodes, you can press enter to skip this step; separate multiple Node nodes with commas, e.g: 192.168.1.1,192.168.1.2,192.168.1.3): "
    ["pod_subnet"]="Please enter the Pod subnet (Press enter to use the default value: 100.64.0.0/10): "
    ["service_subnet"]="Please enter the Service subnet (Press enter to use the default value: 10.96.0.0/22): "
    ["cloud_domain"]="Please enter the cloud domain name (You can use the nip.io domain name if you need: [ip].nip.io, for more details, please refer to: http://nip.io, e.g: 127.0.0.1.nip.io): "
    ["cloud_port"]="Please enter the cloud port (Press enter to use the default value: 443): "
    ["certificate_path"]="Please enter the certificate path (Press enter to use the self-signed certificate provided by Sealos): "
    ["private_key_path"]="Please enter the private key path: "
    ["choose_language"]="Please choose a language: "
    ["enter_choice"]="Please enter your choice (zh/en): "
    ["k8s_installation"]="Installing Kubernetes cluster."
    ["ingress_installation"]="Installing Ingress-nginx-controller and Kubeblocks."
    ["installing_monitoring"]="Installing kubernetes monitoring."
    ["patching_ingress"]="Modifying the tolerance of Ingress-nginx-controller to allow it to run on the master node."
    ["installing_cloud"]="Installing Sealos Cloud."
    ["avx_not_supported"]="CPU does not support AVX instruction set."
    ["ssh_private_key"]="Please enter the ssh private key path (Press enter to use the default value: '/root/.ssh/id_rsa'): "
    ["ssh_password"]="Please enter the ssh password (Press enter to use password-free login): "
    ["wait_cluster_ready"]="Waiting for the cluster to be ready, if you want to skip this step, please enter 'y': "
    ["cilium_requirement"]="Using Cilium as the network plugin, the host system must meet the following requirements:
1. Hosts with AMD64 or AArch64 architecture;
2. Linux kernel> = 4.19.57 or equivalent version (e.g., 4.18 on RHEL8)."
    ["mongo_avx_requirement"]="MongoDB 5.0 version depends on a CPU that supports the AVX instruction set. The current environment does not support AVX, so it has been switched to MongoDB 4.4 version. For more information, see: https://www.mongodb.com/docs/v5.0/administration/production-notes/"
    ["usage"]="Usage: $0 [options]=[value] [options]=[value] ...

Options:
  --image-registry                  # Image repository address (default: docker.io)
  --image-repository                # Image repository name (default: labring)
  --kubernetes-version              # Kubernetes version (default: 1.27.11)
  --cilium-version                  # Cilium version (default: 1.14.8)
  --cert-manager-version            # Cert Manager version (default: 1.14.6)
  --helm-version                    # Helm version (default: 3.14.1)
  --openebs-version                 # OpenEBS version (default: 3.10.0)
  --ingress-nginx-version           # Ingress Nginx version (default: 1.9.4)
  --kubeblocks-version              # Kubeblocks version (default: 0.8.2)
  --metrics-server-version          # Metrics Server version (default: 0.6.4)
  --cloud-version                   # Sealos Cloud version (default: latest)
  --mongodb-version                 # MongoDB version (default: mongodb-5.0)
  --master-ips                      # Master node IP list, separated by commas (no need to fill in for single node and current execution node)
  --node-ips                        # Node node IP list, separated by commas
  --ssh-private-key                 # SSH private key path (default: $HOME/.ssh/id_rsa)
  --ssh-password                    # SSH password
  --pod-cidr                        # Pod subnet (default: 100.64.0.0/10)
  --service-cidr                    # Service subnet (default: 10.96.0.0/22)
  --cloud-domain                    # Cloud domain name
  --cloud-port                      # Cloud port (default: 443)
  --cert-path                       # Certificate path
  --key-path                        # Private key path
  --single                          # Whether to install on a single node (y/n)
  --proxy-prefix                    # Sealos binary installation address proxy prefix
  --zh                              # Chinese prompt
  --en                              # English prompt
  --help                            # Help information"
)
PROMPTS_CN=(
    ["pre_prompt"]="依赖 iptables, 请确保 iptables 已经安装, 多节点需要配置 ssh 免密登录或密码一致, 使用 Sealos 提供的自签证书安装完成后需要自信任证书"
    ["pull_image"]="正在拉取镜像: "
    ["pull_image_success"]="镜像拉取成功: "
    ["pull_image_failed"]="镜像拉取失败: "
    ["install_sealos"]="Sealos CLI 尚未安装, 是否安装? (y/n): "
    ["input_master_ips"]="请输入 Master IP (单节点安装可输入回车跳过该步骤; 多个 Master 节点使用逗号分隔, 例: 192.168.0.1,192.168.0.2,192.168.0.3): "
    ["invalid_ips"]="IP无效或错误格式, 请再试一次."
    ["input_node_ips"]="请输入 Node IP (无 Node 节点可输入回车跳过该步骤; 多个 Node 节点使用逗号分隔, 例: 192.168.1.1,192.168.1.2,192.168.1.3): "
    ["pod_subnet"]="请输入 Pod 子网 (回车使用默认值: 100.64.0.0/10): "
    ["service_subnet"]="请输入 Service 子网 (回车使用默认值: 10.96.0.0/22): "
    ["cloud_domain"]="请输入 Sealos Cloud 域名 (无自备域名可使用 nip.io 域名: [ip].nip.io, 详细参考: http://nip.io, 例:127.0.0.1.nip.io): "
    ["cloud_port"]="请输入 Sealos Cloud 端口 (回车使用默认值: 443): "
    ["certificate_path"]="请输入证书路径 (回车使用 Sealos 提供的自签证书): "
    ["private_key_path"]="请输入私钥路径: "
    ["choose_language"]="请选择语言: "
    ["enter_choice"]="请输入您的选择 (zh/en): "
    ["k8s_installation"]="正在安装 Kubernetes 集群."
    ["ingress_installation"]="正在安装 Ingress-nginx-controller 和 Kubeblocks."
    ["installing_monitoring"]="正在安装 kubernetes 监控."
    ["patching_ingress"]="正在修改 Ingress-nginx-controller 的容忍度, 以允许它在主节点上运行."
    ["installing_cloud"]="正在安装 Sealos Cloud."
    ["avx_not_supported"]="CPU 不支持 AVX 指令集."
    ["ssh_private_key"]="请输入 ssh 私钥路径 (回车使用默认值: '/root/.ssh/id_rsa'): "
    ["ssh_password"]="请输入 ssh 密码 (回车使用免密登录): "
    ["wait_cluster_ready"]="正在等待集群就绪, 如果您想跳过此步骤, 请输入'y': "
    ["cilium_requirement"]="正在使用 Cilium 作为网络插件, 主机系统必须满足以下要求:
1.具有AMD64或AArch64架构的主机;
2.Linux内核> = 4.19.57或等效版本 (例如, 在RHEL8上为4.18)."
    ["mongo_avx_requirement"]="MongoDB 5.0版本依赖支持 AVX 指令集的 CPU, 当前环境不支持 AVX, 已切换为 MongoDB 4.4版本, 更多信息查看: https://www.mongodb.com/docs/v5.0/administration/production-notes/"
    ["usage"]="Usage: $0 [options]=[value] [options]=[value] ...

Options:
  --image-registry                # 镜像仓库地址 (默认: docker.io)
  --image-repository              # 镜像仓库名称 (默认: labring)
  --kubernetes-version            # Kubernetes版本 (默认: 1.27.11)
  --cilium-version                # Cilium版本 (默认: 1.14.8)
  --cert-manager-version          # Cert Manager版本 (默认: 1.14.6)
  --helm-version                  # Helm版本 (默认: 3.14.1)
  --openebs-version               # OpenEBS版本 (默认: 3.10.0)
  --ingress-nginx-version         # Ingress Nginx版本 (默认: 1.9.4)
  --kubeblocks-version            # Kubeblocks版本 (默认: 0.8.2)
  --metrics-server-version        # Metrics Server版本 (默认: 0.6.4)
  --cloud-version                 # Sealos Cloud版本 (默认: latest)
  --mongodb-version               # MongoDB版本 (默认: mongodb-5.0)
  --master-ips                    # Master节点IP列表,使用英文逗号分割 (单节点且为当前执行节点可不填写)
  --node-ips                      # Node节点IP列表,使用英文逗号分割
  --ssh-private-key               # SSH私钥路径 (默认: $HOME/.ssh/id_rsa)
  --ssh-password                  # SSH密码
  --pod-cidr                      # Pod子网 (默认: 100.64.0.0/10)
  --service-cidr                  # Service子网 (默认: 10.96.0.0/22)
  --cloud-domain                  # 云域名
  --cloud-port                    # 云端口 (默认: 443)
  --cert-path                     # 证书路径
  --key-path                      # 私钥路径
  --single                        # 是否单节点安装 (y/n)
  --proxy-prefix                  # sealos二进制安装地址代理前缀
  --zh                            # 中文提示
  --en                            # 英文提示
  --help                          # 帮助信息"
)

# Define error handling function
handle_error() {
    echo "An error occurred on line $1 of the script $0"
    echo "Exit code: $2"
    echo "Exiting the script now."
    # TODO add issue address for users to report issues and solutions.
}

# Set trap to the function when an error occurs
trap 'handle_error $LINENO $?' ERR

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
      echo "en. English"
      echo "zh. 中文"
      get_prompt "enter_choice" "y"
      read -p "" lang_choice
      if [[ $lang_choice == "zh" ]]; then
          LANGUAGE="CN"
      fi
  fi
  if [[ $LANGUAGE != "CN" ]]; then
      LANGUAGE="EN"
  fi
}

#TODO mongo 5.0 need avx support, if not support, change to 4.4
setMongoVersion() {
  set +e
  grep avx /proc/cpuinfo > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    get_prompt "mongo_avx_requirement"
    mongodb_version="mongodb-4.4"
  fi
  set -e
}

k8s_installed="n"
k8s_ready="n"

# Initialization
init() {
    if kubectl get no > /dev/null 2>&1; then
        k8s_installed="y"
        if ! kubectl get no | grep NotReady > /dev/null 2>&1; then
            k8s_ready="y"
        fi
    fi
    mkdir -p $CLOUD_DIR

    # Check for sealos CLI
    if ! command -v sealos &> /dev/null; then
        get_prompt "install_sealos"
        read -p " " installChoice
        if [[ "${installChoice,,}" == "y" ]]; then
          local install_url="https://raw.githubusercontent.com/labring/sealos/main/scripts/install.sh"
          [ -z "$proxy_prefix" ] || install_url="${proxy_prefix%/}/$install_url"
          curl -sfL "$install_url" | PROXY_PREFIX=$proxy_prefix sh -s "${SEALOS_VERSION}" labring/sealos
        else
            echo "Please install sealos CLI to proceed."
            exit 1
        fi
    else
        echo "Sealos CLI is already installed."
    fi

    get_prompt "pre_prompt"
    echo ""
    [[ $k8s_installed == "y" ]] || pull_image "kubernetes" "v${kubernetes_version#v:-1.27.11}"
    [[ $k8s_ready == "y" ]] || pull_image "cilium" "v${cilium_version#v:-1.14.8}"
    pull_image "cert-manager" "v${cert_manager_version#v:-1.14.6}"
    pull_image "helm" "v${helm_version#v:-3.14.1}"
    pull_image "openebs" "v${openebs_version#v:-3.10.0}"
    pull_image "ingress-nginx" "v${ingress_nginx_version#v:-1.9.4}"
    pull_image "kubeblocks" "v${kubeblocks_version#v:-0.8.2}"
    pull_image "kubeblocks-redis" "v${kubeblocks_version#v:-0.8.2}"
    pull_image "kubeblocks-apecloud-mysql" "v${kubeblocks_version#v:-0.8.2}"
    pull_image "kubeblocks-postgresql" "v${kubeblocks_version#v:-0.8.2}"
    pull_image "kubeblocks-mongodb" "v${kubeblocks_version#v:-0.8.2}"
    pull_image "cockroach" "v2.12.0"
    pull_image "metrics-server" "v${metrics_server_version#v:-0.6.4}"
    pull_image "victoria-metrics-k8s-stack" "v${victoria_metrics_k8s_stack_version#v:-1.96.0}"
    pull_image "sealos-cloud" "${cloud_version}"
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

    if [[ $k8s_installed == "n" ]]; then
      # Master and Node IPs
      if [[ $single != "y" ]]; then
        if [[ $master_ips == "" ]]; then
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
        if [[ -z "$node_ips" && $single != "y" ]]; then
          while :; do
              read -p "$(get_prompt "input_node_ips")" node_ips
              if validate_ips "$node_ips"; then
                  break
              else
                  get_prompt "invalid_ips"
              fi
          done
        fi
        read -p "$(get_prompt "ssh_private_key")" ssh_private_key

        if [[ -z "$ssh_private_key" ]]; then
            ssh_private_key="${HOME}/.ssh/id_rsa"
        fi
        read -p "$(get_prompt "ssh_password")" ssh_password
      fi

      [[ $pod_cidr != "" ]] || read -p "$(get_prompt "pod_subnet")" pod_cidr
      [[ $service_cidr != "" ]] || read -p "$(get_prompt "service_subnet")" service_cidr
    fi

    while [[ $cloud_domain == "" ]] ; do
        read -p "$(get_prompt "cloud_domain")" cloud_domain
    done
    [[ $cloud_port != "" ]] || read -p "$(get_prompt "cloud_port")" cloud_port

    if [[ $input_cert != "n" && ($cert_path == "" || $key_path == "") ]]; then
        read -p "$(get_prompt "certificate_path")" cert_path
        if [[ $cert_path != "" ]]; then
            read -p "$(get_prompt "private_key_path")" key_path
        fi
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
  match: ${image_registry}/${image_repository}/sealos-cloud:${cloud_version}
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
  match: ${image_registry}/${image_repository}/ingress-nginx:v${ingress_nginx_version#v:-1.9.4}
  path: charts/ingress-nginx/values.yaml
  strategy: merge
"
    echo "$ingress_config" > $CLOUD_DIR/ingress-nginx-config.yaml

    vm_secret='
apiVersion: v1
kind: Secret
metadata:
  name: additional-scrape-configs
  namespace: vm
stringData:
  prometheus-additional.yaml: |
    - honor_labels: true
      job_name: kubeblocks-service
      kubernetes_sd_configs:
        - role: endpoints
      relabel_configs:
        - action: keep
          regex: kubeblocks
          source_labels:
            - __meta_kubernetes_service_label_app_kubernetes_io_managed_by
        - action: drop
          regex: agamotto
          source_labels:
            - __meta_kubernetes_service_label_monitor_kubeblocks_io_managed_by
        - action: keep
          regex: true
          source_labels:
            - __meta_kubernetes_service_annotation_monitor_kubeblocks_io_scrape
        - action: replace
          regex: (https?)
          source_labels:
            - __meta_kubernetes_service_annotation_monitor_kubeblocks_io_scheme
          target_label: __scheme__
        - action: replace
          regex: (.+)
          source_labels:
            - __meta_kubernetes_service_annotation_monitor_kubeblocks_io_path
          target_label: __metrics_path__
        - action: replace
          regex: (.+?)(?::\d+)?;(\d+)
          replacement: $1:$2
          source_labels:
            - __address__
            - __meta_kubernetes_service_annotation_monitor_kubeblocks_io_port
          target_label: __address__
        - action: labelmap
          regex: __meta_kubernetes_service_annotation_monitor_kubeblocks_io_param_(.+)
          replacement: __param_$1
        - action: labelmap
          regex: __meta_kubernetes_service_label_(.+)
        - action: replace
          source_labels:
            - __meta_kubernetes_namespace
          target_label: namespace
        - action: replace
          source_labels:
            - __meta_kubernetes_service_name
          target_label: service
        - action: replace
          source_labels:
            - __meta_kubernetes_pod_node_name
          target_label: node
        - action: replace
          source_labels:
            - __meta_kubernetes_pod_name
          target_label: pod
        - action: drop
          regex: Pending|Succeeded|Failed|Completed
          source_labels:
            - __meta_kubernetes_pod_phase
    - honor_labels: true
      job_name: kubeblocks-agamotto
      kubernetes_sd_configs:
        - role: endpoints
      relabel_configs:
        - action: keep
          regex: agamotto
          source_labels:
            - __meta_kubernetes_service_label_monitor_kubeblocks_io_managed_by
        - action: keep
          regex: true
          source_labels:
            - __meta_kubernetes_service_annotation_monitor_kubeblocks_io_scrape
        - action: replace
          regex: (https?)
          source_labels:
            - __meta_kubernetes_service_annotation_monitor_kubeblocks_io_scheme
          target_label: __scheme__
        - action: replace
          regex: (.+)
          source_labels:
            - __meta_kubernetes_service_annotation_monitor_kubeblocks_io_path
          target_label: __metrics_path__
        - action: replace
          regex: (.+?)(?::\d+)?;(\d+)
          replacement: $1:$2
          source_labels:
            - __address__
            - __meta_kubernetes_service_annotation_monitor_kubeblocks_io_port
          target_label: __address__
        - action: labelmap
          regex: __meta_kubernetes_service_annotation_monitor_kubeblocks_io_param_(.+)
          replacement: __param_$1
        - action: drop
          regex: Pending|Succeeded|Failed|Completed
          source_labels:
            - __meta_kubernetes_pod_phase
'

    echo "$vm_secret" > $CLOUD_DIR/vm-secret.yaml

    sealos_gen_cmd="sealos gen ${image_registry}/${image_repository}/kubernetes:v${kubernetes_version#v:-1.27.11}\
        ${master_ips:+--masters $master_ips}\
        ${node_ips:+--nodes $node_ips}\
        --pk=${ssh_private_key:-$HOME/.ssh/id_rsa}\
        --passwd=${ssh_password} -o $CLOUD_DIR/Clusterfile"

    if [[ $k8s_installed == "n" ]]; then
      $sealos_gen_cmd
      # Modify Clusterfile with sed
      sed -e '/InitConfiguration/a skipPhases:\n  - addon/kube-proxy' -i $CLOUD_DIR/Clusterfile
      sed -i "s|100.64.0.0/10|${pod_cidr:-100.64.0.0/10}|g" $CLOUD_DIR/Clusterfile
      sed -i "s|10.96.0.0/22|${service_cidr:-10.96.0.0/22}|g" $CLOUD_DIR/Clusterfile
    fi
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
        if [[ "$input" == "y" ]]; then
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
    [[ $k8s_installed == "y" ]] || (get_prompt "k8s_installation" && sealos apply -f $CLOUD_DIR/Clusterfile)
    command -v helm > /dev/null 2>&1 || sealos run "${image_registry}/${image_repository}/helm:v${helm_version#v:-3.14.1}"
    [[ $k8s_ready == "y" ]] || (get_prompt "cilium_requirement" && sealos run "${image_registry}/${image_repository}/cilium:v${cilium_version#v:-1.14.8}" --env ExtraValues="ipam.mode=kubernetes")
    wait_cluster_ready
    sealos run "${image_registry}/${image_repository}/cert-manager:v${cert_manager_version#v:-1.14.6}"
    sealos run "${image_registry}/${image_repository}/openebs:v${openebs_version#v:-3.10.0}"
    sealos run "${image_registry}/${image_repository}/metrics-server:v${metrics_server_version#v:-0.6.4}"
    kubectl get sc openebs-backup > /dev/null 2>&1 || kubectl create -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-backup
provisioner: openebs.io/local
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
EOF

    # TODO use sealos run to install cockroachdb-operator
    sealos run "${image_registry}/${image_repository}/cockroach:v2.12.0"

    get_prompt "installing_monitoring"
    sealos run "${image_registry}/${image_repository}/victoria-metrics-k8s-stack:v${victoria_metrics_k8s_stack_version#v:-1.96.0}"

    get_prompt "ingress_installation"
    sealos run ${image_registry}/${image_repository}/ingress-nginx:v${ingress_nginx_version#v:-1.9.4} --config-file $CLOUD_DIR/ingress-nginx-config.yaml

    sealos run ${image_registry}/${image_repository}/kubeblocks:v${kubeblocks_version#v:-0.8.2}
    sealos run ${image_registry}/${image_repository}/kubeblocks-apecloud-mysql:v${kubeblocks_version#v:-0.8.2} \
      ${image_registry}/${image_repository}/kubeblocks-postgresql:v${kubeblocks_version#v:-0.8.2} \
      ${image_registry}/${image_repository}/kubeblocks-mongodb:v${kubeblocks_version#v:-0.8.2} \
      ${image_registry}/${image_repository}/kubeblocks-redis:v${kubeblocks_version#v:-0.8.2}

    kbcli addon enable snapshot-controller

    kubectl apply -f $CLOUD_DIR/vm-secret.yaml
    kubectl patch vmagent -n vm victoria-metrics-k8s-stack --type merge -p '{"spec":{"additionalScrapeConfigs":{"key":"prometheus-additional.yaml","name":"additional-scrape-configs"}}}'
    kubectl rollout restart deploy -n vm vmagent-victoria-metrics-k8s-stack || true

    get_prompt "patching_ingress"
    kubectl patch cm -n ingress-nginx ingress-nginx-controller --patch '{"data":{"allow-snippet-annotations":"true","annotation-value-word-blocklist":"load_module,lua_package,_by_lua,location,root,proxy_pass,serviceaccount"}}'
    kubectl -n ingress-nginx patch ds ingress-nginx-controller -p '{"spec":{"template":{"spec":{"tolerations":[{"key":"node-role.kubernetes.io/control-plane","operator":"Exists","effect":"NoSchedule"}]}}}}'
    kubectl get daemonset ingress-nginx-controller -n ingress-nginx -o json | grep https-port= >/dev/null || kubectl patch daemonset ingress-nginx-controller -n ingress-nginx --type='json' -p="[{'op': 'add', 'path': '/spec/template/spec/containers/0/args/-', 'value': '--https-port=${cloud_port:-443}'}]"
    kubectl get daemonset ingress-nginx-controller -n ingress-nginx -o json | grep default-ssl-certificate= >/dev/null || kubectl patch daemonset ingress-nginx-controller -n ingress-nginx --type='json' -p="[{'op': 'add', 'path': '/spec/template/spec/containers/0/args/-', 'value': '--default-ssl-certificate=sealos-system/wildcard-cert'}]"

    get_prompt "installing_cloud"

    setMongoVersion
    if [[ -n "$tls_crt_base64" ]] || [[ -n "$tls_key_base64" ]]; then
        sealos run ${image_registry}/${image_repository}/sealos-cloud:${cloud_version}\
        --env cloudDomain="$cloud_domain"\
        --env cloudPort="${cloud_port:-443}"\
        --env mongodbVersion="${mongodb_version:-mongodb-5.0}"\
        --config-file $CLOUD_DIR/tls-secret.yaml
    else
        sealos run ${image_registry}/${image_repository}/sealos-cloud:${cloud_version}\
        --env cloudDomain="$cloud_domain"\
        --env cloudPort="${cloud_port:-443}"\
        --env mongodbVersion="${mongodb_version:-mongodb-5.0}"
    fi
    sealos cert --alt-names "$cloud_domain"
}

for i in "$@"; do
  case ${i,,} in
  --image-registry=*) image_registry="${i#*=}"; shift ;;
  --image-repository=*) image_repository="${i#*=}"; shift ;;
  --kubernetes-version=*) kubernetes_version="${i#*=}"; shift ;;
  --cilium-version=*) cilium_version="${i#*=}"; shift ;;
  --cert-manager-version=*) cert_manager_version="${i#*=}"; shift ;;
  --helm-version=*) helm_version="${i#*=}"; shift ;;
  --openebs-version=*) openebs_version="${i#*=}"; shift ;;
  --ingress-nginx-version=*) ingress_nginx_version="${i#*=}"; shift ;;
  --kubeblocks-version=*) kubeblocks_version="${i#*=}"; shift ;;
  --metrics-server-version=*) metrics_server_version="${i#*=}"; shift ;;
  --cloud-version=*) cloud_version="${i#*=}"; shift ;;
  --mongodb-version=*) mongodb_version="${i#*=}"; shift ;;
  --master-ips=*) master_ips="${i#*=}"; shift ;;
  --node-ips=*) node_ips="${i#*=}"; shift ;;
  --ssh-private-key=*) ssh_private_key="${i#*=}"; shift ;;
  --ssh-password=*) ssh_password="${i#*=}"; shift ;;
  --pod-cidr=*) pod_cidr="${i#*=}"; shift ;;
  --service-cidr=*) service_cidr="${i#*=}"; shift ;;
  --cloud-domain=*) cloud_domain="${i#*=}"; shift ;;
  --cloud-port=*) cloud_port="${i#*=}"; shift ;;
  --cert-path=*) cert_path="${i#*=}"; shift ;;
  --key-path=*) key_path="${i#*=}"; shift ;;
  --single) single="y"; shift ;;
  --proxy-prefix=*) proxy_prefix="${i#*=}"; shift ;;
  --zh | zh ) LANGUAGE="CN"; shift ;;
  --en | en ) LANGUAGE="EN"; shift ;;
  --config=* | -c ) source ${i#*=} > /dev/null; shift ;;
  -h | --help) HELP=true; shift ;;
  -d | --debug) set -x; shift ;;
  --image-registry | image-registry | \
  --image-repository | image-repository | \
  --kubernetes-version | kubernetes-version | \
  --cilium-version | cilium-version | \
  --cert-manager-version | cert-manager-version | \
  --helm-version | helm-version | \
  --openebs-version | openebs-version | \
  --ingress-nginx-version | ingress-nginx-version | \
  --kubeblocks-version | kubeblocks-version | \
  --metrics-server-version | metrics-server-version | \
  --cloud-version | cloud-version | \
  --mongodb-version | mongodb-version | \
  --master-ips | master-ips | \
  --node-ips | node-ips | \
  --ssh-private-key | ssh-private-key | \
  --ssh-password | ssh-password | \
  --pod-cidr | pod-cidr | \
  --service-cidr | service-cidr | \
  --cloud-domain | cloud-domain | \
  --cloud-port | cloud-port | \
  --cert-path | cert-path | \
  --key-path | key-path | \
  --proxy-prefix | proxy-prefix | \
  --config | config) echo "Please use '--${i#--}=' to assign value to option"; exit 1 ;;
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

echo -e "${BOLD}Sealos cloud login info:${RESET}\nCloud Version: ${GREEN}${cloud_version}${RESET}\nURL: ${GREEN}https://$cloud_domain${cloud_port:+:$cloud_port}${RESET}\nadmin Username: ${GREEN}admin${RESET}\nadmin Password: ${GREEN}sealos2023${RESET}"
