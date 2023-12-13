---
sidebar_position: 0
---

# K8s 集群生命周期管理

Sealos 提供一套强大的工具，使得用户可以便利地管理整个集群的生命周期。

## 功能介绍

使用 Sealos，您可以安装一个不包含任何组件的裸 Kubernetes 集群。此外，Sealos 还可以在 Kubernetes 之上，通过集群镜像能力组装各种上层分布式应用，如数据库、消息队列等。

Sealos 不仅可以安装一个单节点的 Kubernetes 开发环境，还能构建数千节点的生产高可用集群。

Sealos 具有自由伸缩集群、备份恢复、释放集群等功能，即使在离线环境中，Sealos 也能提供出色的 Kubernetes 运行体验。

## 主要特性

- 支持 ARM，v1.20 以上版本离线包支持 containerd 与 docker 集成
- 提供 99 年证书，支持集群备份，升级
- 不依赖 ansible、haproxy、keepalived，一个二进制工具，零依赖
- 提供离线安装，不同 Kubernetes 版本只需使用不同的集群镜像
- 高可用性由 ipvs 实现的 localLB 提供，占用资源少，稳定可靠，类似 kube-proxy 的实现
- 使用 image-cri-shim 自动识别镜像名称，使离线交付更方便
- 几乎兼容所有支持 systemd 的 x86_64 架构的环境
- 轻松实现集群节点的增加/删除
- 已有数万用户在线上环境使用 Sealos，稳定可靠
- 支持集群镜像，自由组合定制你需要的集群，如 openebs 存储+数据库+minio 对象存储
- 使用 buildah 的 sdk 实现对镜像标准统一，完全兼容 OCI 的标准

## 使用 Sealos 运行 Kubernetes 集群

使用 Sealos 运行一个 Kubernetes 集群非常简单，只需以下步骤：

```bash
$ curl -sfL  https://raw.githubusercontent.com/labring/sealos/v4.3.0/scripts/install.sh \
    | sh -s v4.3.0 labring/sealos
# 创建一个集群
$ sealos run labring/kubernetes:v1.25.0-4.2.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```

[![asciicast](https://asciinema.org/a/519263.svg)](https://asciinema.org/a/519263?speed=3)

## 在集群上运行分布式应用

通过 `sealos run` 命令，您可以在集群上运行各种分布式应用，如数据库、消息队列、AI 能力，甚至企业级 SaaS 软件。例如：

```shell
# MySQL 集群
$ sealos run labring/mysql-operator:8.0.23-14.1

# Clickhouse 集群
$ sealos run labring/clickhouse:0.18.4

# Redis 集群
$ sealos run labring/redis-operator:3.1.4
```

## 自定义集群

对于 Sealos 生态没有的集群镜像，用户可以方便地自己构建和定制属于自己的集群镜像。例如：

[构建一个 ingress 集群镜像](/self-hosting/lifecycle-management/quick-start/build-ingress-cluster-image.md)

您还可以定制一个完全属于自己的 Kubernetes：

Sealfile:

```shell
FROM kubernetes:v1.25.0
COPY flannel-chart .
COPY mysql-chart .
CMD ["helm install flannel flannel-chart", "helm install mysql mysql-chart"]
```

```shell
sealos build -t my-kuberentes:v1.25.0 .
sealos run my-kuberentes:v1.25.0 ...
```

## 常见问题

**Sealos 是 Kubernetes 安装工具吗？**

安装部署只是 Sealos 的一个基本功能，如同单机操作系统有 Boot 模块一样，Sealos 的 Boot 模块可以很好地管理 Kubernetes 在任何场景下的生命周期。

**Sealos 和 Rancher、KubeSphere 有什么区别？**

Sealos 的设计理念是 "化整为零，自由组装，大道至简"。Sealos 利用 Kubernetes 的能力，以简单的方式提供给用户真正需要的东西。用户需要的不一定是 Kubernetes，用户需要的是具体的能力。

Sealos 是极其灵活的，不会给用户带来额外负担。它的形态取决于用户的需求和安装的应用。Sealos 的核心是分布式应用，所有应用都是一等公民。
