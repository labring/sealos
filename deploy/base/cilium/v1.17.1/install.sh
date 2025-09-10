#!/bin/bash

HELM_OPTS="${HELM_OPTS:-}"

KUBEADM_POD_SUBNET="${KUBEADM_POD_SUBNET:-"100.64.0.0/16"}"
KUBEADM_SERVICE_RANGE="${KUBEADM_SERVICE_RANGE:-"30000-50000"}"
CILIUM_MASKSIZE="${CILIUM_MASKSIZE:-"24"}"

KUBEADM_SERVICE_RANGE=$(echo "$KUBEADM_SERVICE_RANGE" | sed 's/-/,/')

cat << EOF > np.yaml
nodePort:
  range: "${KUBEADM_SERVICE_RANGE}"
EOF

helm upgrade --install cilium -n kube-system charts/cilium -f values-cloud.yaml ${HELM_OPTS} \
      --set ipam.operator.clusterPoolIPv4PodCIDRList="${KUBEADM_POD_SUBNET}" \
      -f np.yaml --set ipam.operator.clusterPoolIPv4MaskSize="${CILIUM_MASKSIZE}"