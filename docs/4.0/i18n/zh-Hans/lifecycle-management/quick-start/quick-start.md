---
sidebar_position: 2
---

# 快速开始

## 先决条件 

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

### CPU 架构  

目前支持 `amd64` 和 `arm64` 架构。


## 单机安装 Kuberentes

```shell
# sealos version must >= v4.1.0
$ sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 --single
```

## 集群安装 Kuberentes

```shell
$ sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```

注意：labring/helm 应当在 labring/calico 之前。

参数说明：

| 参数名 | 参数值示例 | 参数说明 |
| --- | --- | --- |
| --masters |  192.168.0.2 | kubernetes master 节点地址列表 |
| --nodes | 192.168.0.3 | kubernetes node 节点地址列表 |
| --ssh-passwd | [your-ssh-passwd] | ssh 登录密码 |
|kubernetes | labring/kubernetes:v1.25.0 | kubernetes 镜像 |

在干净的服务器上直接执行上面命令，不要做任何多余操作即可启动一个高可用的 kubernetes 集群。

## 安装各种分布式应用

```shell
sealos run labring/helm:v3.8.2 # install helm
sealos run labring/openebs:v1.9.0 # install openebs
sealos run labring/minio-operator:v4.4.16 labring/ingress-nginx:4.1.0 \
   labring/mysql-operator:8.0.23-14.1 labring/redis-operator:3.1.4 # oneliner
```

这样高可用的 mysql redis 等都有了，不用关心所有的依赖问题。

## 增加节点

增加 node 节点：
```shell
$ sealos add --nodes 192.168.64.21,192.168.64.19 
```

增加 master 节点：
```shell
$ sealos add --masters 192.168.64.21,192.168.64.19 
```

## 删除节点

删除 node 节点：
```shell
$ sealos delete --nodes 192.168.64.21,192.168.64.19 
```

删除 master 节点：
```shell
$ sealos delete --masters 192.168.64.21,192.168.64.19  
```

## 清理集群

```shell
$ sealos reset
```



## 离线交付

离线环境只需要提前导入镜像，其它步骤与在线安装一致。

首先在有网络的环境中 save 安装包：
```shell
$ sealos pull labring/kubernetes:v1.25.0
$ sealos save -o kubernetes.tar labring/kubernetes:v1.25.0
```
### load镜像并安装

拷贝 kubernetes.tar 到离线环境, 使用 load 命令导入镜像即可：

```shell
$ sealos load -i kubernetes.tar
```

剩下的安装方式与在线安装一致。
```shell
$ sealos images # 查看集群镜像是否导入成功
$ sealos run kuberentes:v1.25.0  # 单机安装，集群安装同理
```

### 快速启动集群

```shell
$ sealos run kubernetes.tar # 单机安装，集群安装同理
```



## 集群镜像版本支持说明

### 支持 containerd 的 Kubernetes（k8s 版本 >=1.18.0）

| k8s 版本 | sealos 版本       | cri 版本 | 镜像版本                   |
| -------- | ----------------- | -------- | -------------------------- |
| `<1.25`  | `>=v4.0.0`        | v1alpha2 | labring/kubernetes:v1.24.0 |
| `>=1.25` | `>=v4.1.0`        | v1alpha2 | labring/kubernetes:v1.25.0 |
| `>=1.26` | `>=v4.1.4-rc3`    | v1       | labring/kubernetes:v1.26.0 |
| `>=1.27` | `>=v4.2.0-alpha3` | v1       | labring/kubernetes:v1.27.0 |

这些镜像使用 containerd 作为容器运行时（CRI）。containerd 是一种轻量级、高性能的容器运行时，与 Docker 兼容。使用 containerd 的 Kubernetes 镜像可以提供更高的性能和资源利用率。

根据 Kubernetes 版本的不同，您可以选择不同的 sealos 版本和 cri 版本。例如，如果您要使用 Kubernetes v1.26.0 版本，您可以选择 sealos v4.1.4-rc3 及更高版本，并使用 v1 cri 版本。

#### 支持 docker 的 Kubernetes（k8s 版本 >=1.18.0）

| k8s 版本 | sealos 版本       | cri 版本 | 镜像版本                          |
| -------- | ----------------- | -------- | --------------------------------- |
| `<1.25`  | `>=v4.0.0`        | v1alpha2 | labring/kubernetes-docker:v1.24.0 |
| `>=1.25` | `>=v4.1.0`        | v1alpha2 | labring/kubernetes-docker:v1.25.0 |
| `>=1.26` | `>=v4.1.4-rc3`    | v1       | labring/kubernetes-docker:v1.26.0 |
| `>=1.27` | `>=v4.2.0-alpha3` | v1       | labring/kubernetes-docker:v1.27.0 |

这些镜像使用 docker 作为容器运行时（CRI）。docker 是一种广泛使用的、功能丰富的容器平台，提供了易于使用的界面和丰富的生态系统。使用 docker 的 Kubernetes 镜像可以方便地与现有的 docker 基础设施集成。

与支持 containerd 的 Kubernetes 镜像类似，您可以根据 Kubernetes 版本的不同选择不同的 sealos 版本和 cri 版本。例如，如果您要使用 Kubernetes v1.26.0 版本，您可以选择 sealos v4.1.4-rc3 及更高版本，并使用 v1 cri 版本。

## 总结

您在 Kubernetes 集群中运行容器我们提供了多种选择。您可以根据自己的需求和偏好，在不同的镜像类型和版本中进行选择。同时，不要忘记查看 [更新日志](https://github.com/labring/sealos/blob/main/CHANGELOG/CHANGELOG.md)，以了解各个版本的更新内容和修复问题。
