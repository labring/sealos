#!/bin/bash


set -e

# Configurations
CLOUD_DIR="/root/.sealos/cloud"
SEALOS_VERSION="v4.3.3"
# TODO add support for multiple cloud versions

# Initialization
init() {
    mkdir -p $CLOUD_DIR

    # Check for sealos CLI
    if ! command -v sealos &> /dev/null; then
        echo "Sealos CLI is not installed."
        read -p "Do you want to install it now? (y/n): " installChoice
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

# Gather user input
collect_input() {
    # Master and Node IPs
    read -p "Please enter Master IPs (comma separated, at least one required): " masterIps
    while [[ -z "$masterIps" ]]; do
        read -p "At least one Master IP is required. Please try again: " masterIps
    done
    read -p "Please enter Node IPs (comma separated, leave empty if none): " nodeIps

    # Cluster settings
    read -p "Please enter pod subnet (default: 100.64.0.0/10): " podCidr
    read -p "Please enter service subnet (default: 10.96.0.0/22): " serviceCidr
    read -p "Please enter cloud domain: " cloudDomain

    # Certificate handling
    read -p "Do you want to input a certificate? (y/n): " inputCert
    if [[ $inputCert == "y" || $inputCert == "Y" ]]; then
        read -p "Please input the certificate path: " certPath
        read -p "Please input the private key path: " keyPath
    fi
}

# Prepare configurations
prepare_configs() {
    if [[ $inputCert == "y" || $inputCert == "Y" ]]; then
        # Convert certificate and key to base64
        tls_crt_base64=$(cat $certPath | base64 | tr -d '\n')
        tls_key_base64=$(cat $keyPath | base64 | tr -d '\n')

        # Define YAML content for certificate
        yaml_content="
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
        echo "$yaml_content" > $CLOUD_DIR/tls-secret.yaml
    fi

    sealos_gen_cmd="sealos gen labring/kubernetes:v1.25.6\
        labring/helm:v3.12.0\
        labring/cilium:v1.12.14\
        labring/cert-manager:v1.8.0\
        labring/openebs:v3.4.0\
        --masters $masterIps"

    if [ -n "$nodeIps" ]; then
        sealos_gen_cmd+=" --nodes $nodeIps"
    fi

    $sealos_gen_cmd > $CLOUD_DIR/Clusterfile

    # Modify Clusterfile with sed
    sed -i "s|100.64.0.0/10|${podCidr:-100.64.0.0/10}|g" $CLOUD_DIR/Clusterfile
    sed -i "s|10.96.0.0/22|${serviceCidr:-10.96.0.0/22}|g" $CLOUD_DIR/Clusterfile
}

# Execute commands based on collected input and prepared configs
execute_commands() {
    echo "Installing Kubernetes cluster."
    sealos apply -f $CLOUD_DIR/Clusterfile

    echo "Installing ingress-nginx-controller and kubeblocks."
    sealos run docker.io/labring/kubernetes-reflector:v7.0.151\
        docker.io/labring/ingress-nginx:v1.5.1\
        docker.io/labring/kubeblocks:v0.6.2\
        --config-file $CLOUD_DIR/ingress-nginx-config.yaml

    echo "Patching ingress-nginx-controller tolerations to allow it to run on master node. If you don't want it to run on master node, please skip this step."
    kubectl -n ingress-nginx patch ds ingress-nginx-controller -p '{"spec":{"template":{"spec":{"tolerations":[{"key":"node-role.kubernetes.io/control-plane","operator":"Exists","effect":"NoSchedule"}]}}}}'

    echo "Installing sealos cloud."
    if [[ $inputCert == "y" || $inputCert == "Y" ]]; then
        sealos run docker.io/labring/sealos-cloud:latest\
        --env cloudDomain="$cloudDomain"\
        --config-file $CLOUD_DIR/tls-secret.yaml
    else
        sealos run docker.io/labring/sealos-cloud:latest\
        --env cloudDomain="$cloudDomain"
    fi
}

# Main script execution
init
collect_input
prepare_configs
execute_commands
