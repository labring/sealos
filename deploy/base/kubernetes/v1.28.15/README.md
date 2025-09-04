# kubernetes by sealos

Kubernetes is an open-source container orchestration platform that automates the deployment, scaling, and management of containerized applications. It provides a robust and scalable infrastructure for running applications in a distributed environment.

## Changes

- Base on  labring/kubernetes:v1.28.15
- Skip kube-proxy installation
- add env KUBEADM_POD_SUBNET for pod cidr
- add env KUBEADM_SERVICE_SUBNET for service cidr
- add env KUBEADM_MAX_PODS for max pods on one node

## Usage

```bash
  sealos run -e KUBEADM_MAX_PODS=200 ghcr.io/labring/sealos/kubernetes:v1.28.15 
```