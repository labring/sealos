---
sidebar_position: 5
---

# 支持 containerd 的 Kubernetes（k8s 版本 >=1.18.0）

| k8s 版本 | sealos 版本       | cri 版本 | 镜像版本                   |
| -------- | ----------------- | -------- | -------------------------- |
| `<1.25`  | `>=v4.0.0`        | v1alpha2 | labring/kubernetes:v1.24.0 |
| `>=1.25` | `>=v4.1.0`        | v1alpha2 | labring/kubernetes:v1.25.0 |
| `>=1.26` | `>=v4.1.4-rc3`    | v1       | labring/kubernetes:v1.26.0 |
| `>=1.27` | `>=v4.2.0-alpha3` | v1       | labring/kubernetes:v1.27.0 |

# 支持 docker 的 Kubernetes（k8s 版本 >=1.18.0）

| k8s 版本 | sealos 版本       | cri 版本 | 镜像版本                          |
| -------- | ----------------- | -------- | --------------------------------- |
| `<1.25`  | `>=v4.0.0`        | v1alpha2 | labring/kubernetes-docker:v1.24.0 |
| `>=1.25` | `>=v4.1.0`        | v1alpha2 | labring/kubernetes-docker:v1.25.0 |
| `>=1.26` | `>=v4.1.4-rc3`    | v1       | labring/kubernetes-docker:v1.26.0 |
| `>=1.27` | `>=v4.2.0-alpha3` | v1       | labring/kubernetes-docker:v1.27.0 |

为了帮助您更好地了解这些 Kubernetes 镜像，我们将在以下几个方面对这些镜像进行详细介绍：

1. 支持 containerd 的 Kubernetes 镜像
2. 支持 docker 的 Kubernetes 镜像

## 1. 支持 containerd 的 Kubernetes 镜像

这些镜像使用 containerd 作为容器运行时（CRI）。containerd 是一种轻量级、高性能的容器运行时，与 Docker 兼容。使用 containerd 的 Kubernetes 镜像可以提供更高的性能和资源利用率。

根据 Kubernetes 版本的不同，您可以选择不同的 sealos 版本和 cri 版本。例如，如果您要使用 Kubernetes v1.26.0 版本，您可以选择 sealos v4.1.4-rc3 及更高版本，并使用 v1 cri 版本。

## 2. 支持 docker 的 Kubernetes 镜像

这些镜像使用 docker 作为容器运行时（CRI）。docker 是一种广泛使用的、功能丰富的容器平台，提供了易于使用的界面和丰富的生态系统。使用 docker 的 Kubernetes 镜像可以方便地与现有的 docker 基础设施集成。

与支持 containerd 的 Kubernetes 镜像类似，您可以根据 Kubernetes 版本的不同选择不同的 sealos 版本和 cri 版本。例如，如果您要使用 Kubernetes v1.26.0 版本，您可以选择 sealos v4.1.4-rc3 及更高版本，并使用 v1 cri 版本。

## 总结

本文档介绍了支持 containerd 和 docker 的 Kubernetes 镜像，以及与其对应的 sealos 版本和 cri 版本。这些镜像为您在 Kubernetes 集群中运行容器提供了多种选择。您可以根据自己的需求和偏好，在不同的镜像类型和版本中进行选择。同时，不要忘记查看 [更新日志](https://github.com/labring/sealos/blob/main/CHANGELOG/CHANGELOG.md)，以了解各个版本的更新内容和修复问题。
