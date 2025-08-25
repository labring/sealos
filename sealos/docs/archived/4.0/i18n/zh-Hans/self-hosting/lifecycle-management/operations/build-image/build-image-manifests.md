---
sidebar_position: 2
---

# 构建基于部署清单的集群镜像

本文档将详细介绍如何构建基于部署清单（Deployment Manifest）的集群镜像。我们将以一个简单的nginx应用为例来进行说明。

## 一、准备工作

1. 首先，创建一个基础目录作为构建工作区。

```shell
$ mkdir ~/cloud-images
```

2. 创建一个名为 `manifests` 的目录来存储 kubernetes nginx 部署 yaml 文件。

```shell
$ cd cloud-images
$ mkdir manifests
```

## 二、准备清单文件

在这个阶段，我们将准备一个简单的nginx kubernetes yaml文件。

```shell
$ cat manifests/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 2
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.23.1
        ports:
        - containerPort: 80
```

## 三、创建Kubefile

在这个阶段，我们需要创建一个Kubefile文件，该文件将用于构建镜像。

```shell
FROM scratch
COPY manifests manifests
COPY registry registry
CMD ["kubectl apply -f manifests/deployment.yaml"]
```

## 四、构建集群镜像

在准备好所有必需的文件和目录后，我们可以开始构建集群镜像。

```shell
sealos build -t labring/nginx:v1.23.1 .
```

**注意：** 在开始构建前，您需要先在本地主机上安装 sealos 命令。

构建过程中，您可以查看构建日志。

## 五、验证镜像

在构建完毕后，可以通过下列命令查看构建的镜像：

```shell
root@ubuntu:~/cloud-images# sealos images
labring/nginx                      v1.23.1          521c85942ee4   4 minutes ago   56.8 MB
```

## 六、推送镜像

最后，我们可以将构建好的镜像推送至任何Docker镜像仓库，以下命令将其推送至DockerHub。

```shell
sealos push labring/nginx:v1.23.1
```

**注意：** 请使用 sealos 命令来操作集群镜像，Docker 命令不受支持。

如果你使用的是私有镜像仓库，只需要在拉取或推送镜像前使用 `sealos login` 登录仓库即可。

```shell
sealos login docker.io -u xxx -p xxx

sealos login registry.cn-hangzhou.aliyuncs.com -u xxx -p xxx
```

至此，基于部署清单的集群镜像已经构建完成。