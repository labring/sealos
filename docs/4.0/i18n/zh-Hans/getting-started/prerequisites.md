---
sidebar_position: 0
---

# 先决条件 

sealos 是一个简单的 go 二进制文件，可以安装在大多数 Linux 操作系统中。

以下是一些基本的安装要求： 

- 每个集群节点应该有不同的主机名。 主机名不要带下划线。
- 所有节点的时间同步。 
- 在 Kubernetes 集群的第一个节点上运行`sealos run`命令，目前集群外的节点不支持集群安装。 
- 建议使用干净的操作系统来创建集群。不要自己装 Docker。
- 支持大多数 Linux 发行版，例如：Ubuntu CentOS Rocky linux。 
- 支持 [DockerHub](https://hub.docker.com/r/labring/kubernetes/tags) 中支持的 Kubernetes 版本。 
- 支持使用 containerd 作为容器运行时。
- 在公有云上请使用私有 IP。

## CPU 架构  

目前支持 `amd64` 和 `arm64` 架构。
