# Sealos Deploy Base Components

This directory contains pre-built Kubernetes application images optimized for the Sealos platform. Each component has been customized and packaged as OCI images that can be deployed using Sealos.

## Overview

The `deploy/base` directory provides essential infrastructure components for Kubernetes clusters:

- **Container Network Interface (CNI)**: Cilium for advanced networking
- **Certificate Management**: cert-manager for TLS certificate automation  
- **Storage Solutions**: OpenEBS for persistent storage
- **Package Management**: Helm for application deployment
- **Service Mesh & Gateway**: Higress for API gateway and service mesh
- **Database**: CockroachDB for distributed SQL
- **Monitoring**: Victoria Metrics stack for observability
- **Resource Metrics**: metrics-server for resource monitoring
- **Data Management**: KubeBlocks for cloud-native databases
- **Core Platform**: Kubernetes orchestration platform

## Components and Versions

| Component | Version | Description |
|-----------|---------|-------------|
| [cert-manager](#cert-manager) | v1.14.6 | X.509 certificate management for Kubernetes |
| [cilium](#cilium) | v1.17.1 | eBPF-based networking, observability, and security |
| [cockroach](#cockroach) | v2.12.0 | Distributed SQL database |
| [helm](#helm) | v3.16.2 | Package manager for Kubernetes |
| [higress](#higress) | v2.1.3 | Cloud-native API gateway and service mesh |
| [kubeblocks](#kubeblocks) | v0.8.2 | Cloud-native data management platform |
| [kubernetes](#kubernetes) | v1.28.15 | Container orchestration platform |
| [metrics-server](#metrics-server) | v0.6.4 | Resource metrics API for horizontal pod autoscaling |
| [openebs](#openebs) | v3.10.0 | Container-attached storage solution |
| [victoria_metrics_k8s_stack](#victoria-metrics-k8s-stack) | v1.124.0 | Complete monitoring stack |

## Component Details

### cert-manager

**Changes:**
- Base image: `docker.io/labring/cert-manager:v1.14.6`
- Ready-to-deploy certificate management solution

**Usage:**
```bash
sealos run ghcr.io/labring/sealos/cert-manager:v1.14.6
```

### cilium

**Changes:**
- Base images: `docker.io/labring/cilium:v1.17.1`
- Optimized for sealos deployment
- add env KUBEADM_POD_SUBNET、KUBEADM_SERVICE_RANGE、CILIUM_MASKSIZE for network configuration

**Usage:**
```bash
sealos run ghcr.io/labring/sealos/cilium:v1.17.1
```

### cockroach

**Changes:**
- Base image: `docker.io/labring/cockroach:v2.12.0`
- Pre-configured for Kubernetes deployment

**Usage:**
```bash
sealos run ghcr.io/labring/sealos/cockroach:v2.12.0
```

### helm

**Changes:**
- Base image: `docker.io/labring/helm:v3.16.2`
- Helm package manager ready for cluster use

**Usage:**
```bash
sealos run ghcr.io/labring/sealos/helm:v3.16.2
```

### higress

**Changes:**
- Base on helm chart from [higress.io](https://higress.io/helm-charts)
- Added condition for higress console (charts/higress/Chart.yaml line 10: `condition: higress-console.enabled`)
- Custom configuration files for cloud deployment
- Replace registry domain higress-registry.cn-hangzhou.cr.aliyuncs.com to higress-registry.ap-southeast-7.cr.aliyuncs.com

**Environment Variables:**
- `CLOUD_PORT` (default: `443`) - HTTPS port for the gateway
- `CLOUD_DOMAIN` (default: `"127.0.0.1.nip.io"`) - Domain for the service
- `HELM_OPTS` - Additional Helm options

**Usage:**
```bash
sealos run -e CLOUD_PORT=443 -e CLOUD_DOMAIN=sealos.cloud ghcr.io/labring/sealos/higress:v2.1.3
```

### kubeblocks

**Changes:**
- Includes CRDs and snapshot controller
- Pre-installed kbcli tool
- Automated backup repository setup
- KubeBlocks addons installation scripts

**Environment Variables:**
- Standard Kubernetes deployment environment variables

**Usage:**
```bash
sealos run ghcr.io/labring/sealos/kubeblocks:v0.8.2
```

### kubernetes

**Changes:**
- Base on `labring/kubernetes:v1.28.15`
- Skip kube-proxy installation
- Add environment variable support for network configuration
- Add environment variable for max pods per node

**Environment Variables:**
- `KUBEADM_POD_SUBNET` - Pod CIDR for cluster networking
- `KUBEADM_SERVICE_SUBNET` - Service CIDR for cluster services  
- `KUBEADM_MAX_PODS` - Maximum pods per node (default varies by setup)

**Usage:**
```bash
sealos run -e KUBEADM_MAX_PODS=200 ghcr.io/labring/sealos/kubernetes:v1.28.15
```

### metrics-server

**Changes:**
- Base image optimized for sealos deployment
- Resource metrics collection for HPA and VPA

**Usage:**
```bash
sealos run ghcr.io/labring/sealos/metrics-server:v0.6.4
```

### openebs

**Changes:**
- Base on helm chart from [openebs.github.io](https://openebs.github.io/openebs)
- Set `lvm-localpv=enabled` for cache images
- Removed mayastor sub-chart
- Custom storage class configuration for backup volumes

**Environment Variables:**
- `OPENEBS_STORAGE_PREFIX` (default: `"/var/openebs"`) - Base directory for storage
- `OPENEBS_USE_LVM` (default: `"false"`) - When `OPENEBS_USE_LVM=true`, disables localpv and disables default storageclass. When `OPENEBS_USE_LVM=false`, enables localpv and enables default storageclass, and automatically creates an `openebs-backup` storageclass
- `NAME` (default: `"openebs"`) - Helm release name
- `NAMESPACE` (default: `"openebs"`) - Kubernetes namespace
- `HELM_OPTS` - Additional Helm options

**Usage:**
```bash
sealos run --env OPENEBS_STORAGE_PREFIX="/data/openebs" ghcr.io/labring/sealos/openebs:v3.10.0
```

### victoria-metrics-k8s-stack

**Changes:**
- Complete monitoring stack with Grafana, Prometheus-compatible metrics collection
- Custom configuration for KubeBlocks integration
- Grafana service configured as NodePort
- Additional prometheus configuration for extended metrics collection

**Environment Variables:**
- `NAME` (default: `"vm-stack"`) - Helm release name
- `NAMESPACE` (default: `"vm"`) - Kubernetes namespace
- `CHARTS` (default: `"./charts/victoria-metrics-k8s-stack"`) - Chart path
- `HELM_OPTS` (default: `"--set grafana.service.type=NodePort"`) - Helm options

**Usage:**
```bash
sealos run ghcr.io/labring/sealos/victoria-metrics-k8s-stack:v1.124.0
```

## Common Environment Variables

All components support these common environment variables:

- `HELM_OPTS` - Additional options to pass to Helm during installation
- `NAME` - Custom name for the Helm release (where applicable)
- `NAMESPACE` - Target Kubernetes namespace for deployment (where applicable)

## Image Registry

All images are available from the GitHub Container Registry:
```
ghcr.io/labring/sealos/<component>:<version>
```

## Installation Notes

1. These images are designed to work with the Sealos platform
2. Most components can be deployed independently or together
3. Some components have dependencies (e.g., storage solutions should be deployed before stateful applications)
4. Environment variables can be passed using the `-e` or `--env` flag with `sealos run`

## Support

For issues and documentation, visit:
- [Sealos GitHub Repository](https://github.com/labring/sealos)
- [Sealos Documentation](https://docs.sealos.io/)