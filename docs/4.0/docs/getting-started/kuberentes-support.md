---
sidebar_position: 5
---
# Kubernetes with containerd Support (k8s version >=1.18.0)

| k8s version | sealos version    | cri version | image version              |
| ----------- | ----------------- | ----------- | -------------------------- |
| `<1.25`     | `>=v4.0.0`        | v1alpha2    | labring/kubernetes:v1.24.0 |
| `>=1.25`    | `>=v4.1.0`        | v1alpha2    | labring/kubernetes:v1.25.0 |
| `>=1.26`    | `>=v4.1.4-rc3`    | v1          | labring/kubernetes:v1.26.0 |
| `>=1.27`    | `>=v4.2.0-alpha3` | v1          | labring/kubernetes:v1.27.0 |

# Kubernetes with docker Support (k8s version >=1.18.0)

| k8s version | sealos version    | cri version | image version                     |
| ----------- | ----------------- | ----------- | --------------------------------- |
| `<1.25`     | `>=v4.0.0`        | v1alpha2    | labring/kubernetes-docker:v1.24.0 |
| `>=1.25`    | `>=v4.1.0`        | v1alpha2    | labring/kubernetes-docker:v1.25.0 |
| `>=1.26`    | `>=v4.1.4-rc3`    | v1          | labring/kubernetes-docker:v1.26.0 |
| `>=1.27`    | `>=v4.2.0-alpha3` | v1          | labring/kubernetes-docker:v1.27.0 |

In order to help you better understand these Kubernetes images, we will provide a detailed introduction to these images in the following aspects:

1. Kubernetes images with containerd support
2. Kubernetes images with docker support

## 1. Kubernetes images with containerd support

These images use containerd as the container runtime (CRI). Containerd is a lightweight, high-performance container runtime that is compatible with Docker. Kubernetes images with containerd support can provide higher performance and resource utilization.

Depending on the Kubernetes version, you can choose different sealos and cri versions. For example, if you want to use Kubernetes v1.26.0, you can choose sealos v4.1.4-rc3 and higher, and use v1 cri version.

## 2. Kubernetes images with docker support

These images use docker as the container runtime (CRI). Docker is a widely used, feature-rich container platform that provides an easy-to-use interface and a rich ecosystem. Kubernetes images with docker support can be easily integrated with existing docker infrastructure.

Similar to Kubernetes images with containerd support, you can choose different sealos and cri versions depending on the Kubernetes version. For example, if you want to use Kubernetes v1.26.0, you can choose sealos v4.1.4-rc3 and higher, and use v1 cri version.

## Conclusion

This document introduces Kubernetes images with containerd and docker support, as well as their corresponding sealos and cri versions. These images provide a variety of choices for running containers in your Kubernetes cluster. You can choose from different image types and versions according to your needs and preferences. Also, don't forget to check the [Changelog](https://github.com/labring/sealos/blob/main/CHANGELOG/CHANGELOG.md) to learn about updates and fixes for each version."
