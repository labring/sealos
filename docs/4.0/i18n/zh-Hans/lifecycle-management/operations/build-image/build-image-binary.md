---
sidebar_position: 4
---

# 构建基于二进制文件的集群镜像

此文档主要介绍了如何使用 `sealos` 工具将单一二进制文件（例如 `helm` 或 `kustomize`）打包为集群镜像，并将它们通过在主节点上部署集群镜像进行安装。以 `helm` 为例，我们将详细介绍如何将二进制文件打包成集群镜像。

## 创建构建工作空间

首先，创建一个基础目录作为构建工作空间：

```shell
$ mkdir ~/cluster-images
```

在工作空间中，创建一个 `opt` 目录用于存储二进制文件：

```shell
$ cd cluster-images
$ mkdir opt/
```

## 准备二进制文件

接下来，我们准备 `helm` 二进制文件。在此，我们从 [github release](https://github.com/helm/helm/releases) 中下载：

```shell
wget https://get.helm.sh/helm-v3.10.1-linux-amd64.tar.gz
tar -zxvf helm-v3.10.1-linux-amd64.tar.gz
chmod a+x linux-amd64/helm
mv linux-amd64/helm opt/
```

## 创建构建镜像所需的 `Sealfile` 文件

创建一个名为 `Sealfile` 的文件，内容如下：

```shell
FROM scratch
COPY opt ./opt
CMD ["cp opt/helm /usr/bin/"]
```

目前的目录结构如下：

```
.
├── Sealfile
└── opt
    └── helm
```

## 构建集群镜像

现在，一切准备就绪，你可以开始构建集群镜像了：

```shell
sealos build -t labring/helm:v3.10.1 .
```

**注意：** 首先你需要在本地主机上安装 `sealos` 命令。

你可以查看构建日志来了解构建过程。

```shell
root@ubuntu:~/cluster-images# sealos build -t labring/helm:v3.10.1 .
...
```

查看构建的镜像，现在所有依赖的二进制文件都已经构建进集群镜像中：

```shell
root@ubuntu:~/cluster-images# sealos images
labring/helm                      v3.10.1          19ed4a24f0fe   3 minutes ago       45.1 MB
```

## 推送镜像

你可以将镜像推送至任何 Docker 镜像仓库，下面的命令将镜像推送到 dockerhub：

```shell
sealos push labring/helm:v3.10.1
```

**注意：** 请使用 `sealos` 命令来操作集群镜像，不支持 Docker 命令。

如果你使用的是私有镜像仓库，可以使用 `sealos login` 命令登录你的镜像仓库，然后再推送或者拉取镜像
