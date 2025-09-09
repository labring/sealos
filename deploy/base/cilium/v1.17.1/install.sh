#!/bin/bash

HELM_OPTS="${HELM_OPTS:-}"

KUBEADM_POD_SUBNET="${KUBEADM_POD_SUBNET:-"100.64.0.0/16"}"
KUBEADM_SERVICE_RANGE="${KUBEADM_SERVICE_RANGE:-"30000-50000"}"
CILIUM_MASKSIZE="${CILIUM_MASKSIZE:-"24"}"

helm upgrade --install cilium -n kube-system charts/cilium -f values-cloud.yaml ${HELM_OPTS} \
      --set ipv4NativeRoutingCIDR="${KUBEADM_POD_SUBNET}" --set ipam.operator.clusterPoolIPv4PodCIDRList="${KUBEADM_POD_SUBNET}" \
      --set nodePort.range="${KUBEADM_SERVICE_RANGE}" --set ipam.operator.clusterPoolIPv4MaskSize="${CILIUM_MASKSIZE}"