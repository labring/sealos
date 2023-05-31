---
sidebar_position: 10
---

# Kubernetes 集群镜像说明文档

本文档主要介绍 Sealos 官方提供的 rootfs 类型集群镜像，包括镜像名称、镜像类型以及镜像版本等方面的说明。

## 镜像名称

Sealos 官方发布的集群镜像主要包括以下几种：

1. kubernetes：使用 containerd 作为容器运行时（CRI）的 Kubernetes 镜像。
2. kubernetes-docker：使用 docker 作为容器运行时（CRI）的 Kubernetes 镜像。
3. kubernetes-crio：使用 crio 作为容器运行时（CRI）的 Kubernetes 镜像。

目前，Sealos 主要提供了 Kubernetes 相关的镜像，而其他类型的集群镜像，如 k3s、k0s 等，尚未提供。

## 镜像类型

根据容器运行时（CRI）的不同，Sealos 提供了不同类型的 Kubernetes 集群镜像：

1. 使用 containerd 作为 CRI 的 Kubernetes 镜像。
2. 使用 docker 作为 CRI 的 Kubernetes 镜像。
3. 使用 crio 作为 CRI 的 Kubernetes 镜像。

用户可以根据自己的需求和偏好，选择合适的镜像类型。

## 镜像版本

Sealos 官方提供的集群镜像有多个版本可供选择，例如：

###  1. 开发版（Development version）

适用于想要尝试项目最新功能的用户。开发版可能包含尚未经过完整测试的新功能和改进，因此可能不够稳定。

示例：`v1.26(v1.26-amd64/v1.26-arm64)`

### 2. 最新版（Latest version）

通常比开发版更稳定，但可能不包含所有的新功能。这是推荐给大多数用户使用的版本。

示例：`v1.26.0(v1.26.0-amd64/v1.26.0-arm64)`

### 3. 发布版（Release version，包含历史版本）

包含了历史版本的发布版。发布版通常经过了严格的测试，被认为是稳定的。

示例：`v1.26.0-4.1.5(v1.26.0-4.1.5-amd64/v1.26.0-4.1.5-arm64)` `4.1.5`是sealos对应版本号

在选择镜像版本时，用户需要根据自己的需求和偏好来选择适合的版本。另外，Sealos 还提供了针对不同处理器架构的子版本，以满足用户在不同硬件平台上的需求。

## 总结

本文档对 Sealos 官方提供的 rootfs 类型集群镜像进行了说明，包括镜像名称、镜像类型以及镜像版本等方面。用户可以根据自己的需求和偏好，在不同的镜像类型和版本中进行选择，以便在 Kubernetes 集群中运行容器。
