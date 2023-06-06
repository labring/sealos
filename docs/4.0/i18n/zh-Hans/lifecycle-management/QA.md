---
sidebar_position: 1
---

# 常见问题

使用Sealos时，您可能会遇到一些问题。以下是一些常见问题的答案和解决方法。

## 镜像构建问题

### Q1: 在构建阶段如何设置代理服务？

在执行构建命令时，可以通过设置HTTP_PROXY环境变量来配置代理服务。

```shell
HTTP_PROXY=socket5://127.0.0.1:7890 sealos build xxxxx
```

### Q2：如何启用buildah的调试日志？

若需要查看buildah的调试日志，可以通过设定`BUILDAH_LOG_LEVEL`环境变量实现。

```shell
BUILDAH_LOG_LEVEL=debug sealos images
```

### Q3：如何在Pod中执行Sealos构建？

若在Pod中执行Sealos构建，请按以下步骤操作：

1. 在Pod中构建镜像，可用以下YAML配置创建Deployment。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: sealoscli
  name: sealoscli
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sealoscli
  strategy: {}
  template:
    metadata:
      labels:
        app: sealoscli
    spec:
      containers:
        - image: #用你的sealos镜像替换
          name: sealoscli
          stdin: true
          stdinOnce: true
          securityContext:
            privileged: true
```

2. 创建Dockerfile。以下是一个例子，根据需要进行修改。

```dockerfile
FROM bitnami/minideb:buster

ARG TARGETOS
ARG TARGETARCH

LABEL from=bitnami/minideb:buster platform=rootcloud team=oam tag=buster name=base

RUN sed -i "s@http://deb.debian.org@http://mirrors.aliyun.com@g" /etc/apt/sources.list && sed -i "s@http://security.debian.org@http://mirrors.aliyun.com/debian-security@g" /etc/apt/sources.list
RUN install_packages curl iputils-ping net-tools telnet procps vim wget jq

ENV LANG=C.UTF-8
ENV LANGUAGE=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV TZ=Asia/Shanghai
```

3. 在Pod中执行构建命令。

```shell
sealos build --arch arm64 --build-arg TARGETOS=linux --build-arg TARGETARCH=arm64 -t test  -f Dockerfile .
```

### Q4：执行Sealos构建时遇到“lgetxattr /var/lib/containers/storage/overlay/0c2afe770ec7870ad4639f18a1b50b3a84718f95c8907f3d54e14dbf0a01d50d/merged/dev/ptmx: no such device”错误？

这个问题可能与`fuse-overlayfs`的版本有关。建议您从[这里](https://github.com/containers/fuse-overlayfs/releases)下载最新版本下载并替换`/bin/fuse-overlayfs`。

## 运行时选择问题

### Q1：如何选择Kubernetes运行时？

Sealos会根据您选择的镜像决定使用哪种运行时。如果选择了kubernetes-docker镜像，Sealos将使用Docker作为运行时；如果选择了kubernetes-crio镜像，Sealos将使用CRI-O作为运行时。

## 版本兼容性问题

### Q1：报错："Applied to cluster error: failed to init exec auth.sh failed exit status 127"？

此问题常因您使用的sealos版本和镜像版本不匹配造成。请确认您的镜像版本和sealos的版本是匹配的。

例如，若您正使用形如kubernetes:v1.xx.x的版本，可能需要升级sealos，特别是在使用较老版本的sealos，而sealos集群镜像则使用了最新版时。

另一种解决方法是选择对应版本的sealos镜像。比如，如果您的sealos版本是4.1.3，那么集群镜像应选择形如kuberntes:v1.24.0-4.1.3的版本。

确保镜像版本和sealos版本的匹配，可以帮助避免此类问题。

### Q2: 如果您在集群中新增了其他域名，或者修改了 service 的 CIDR，并且在添加 master 时出现了错误

为了解决这个问题，Sealos 团队在 4.2.0 版本进行了相应的修复。具体的修复内容和讨论可以在这个 pull request 中查看：https://github.com/labring/sealos/pull/2943。

所以，如果您遇到了这个问题，我们建议您升级到 Sealos 4.2.0 版本。更新后的版本应该能够正确处理这些变更，并且在添加 master 时不会出现错误。

## 文件和目录位置问题

### Q1：如何修改`/root/.sealos`默认目录的存储位置？

若需修改默认的存储位置，可以设置SEALOS_RUNTIME_ROOT环境变量，然后运行sealos命令。建议您将这个环境变量设置为全局的，这样在其他命令或场景中也可以方便使用。

```shell
export SEALOS_RUNTIME_ROOT=/data/.sealos 
sealos run labring/kubernetes:v1.24.0
```

### Q2：如何修改`/var/lib/sealos`默认目录的存储位置？

若需修改默认的存储位置，可以设置SEALOS_DATA_ROOT环境变量，然后运行sealos命令。同样，建议您将这个环境变量设置为全局的。

```shell
export SEALOS_DATA_ROOT=/data/sealos 
sealos run labring/kubernetes:v1.24.0
```

### Q3：ssh传输文件时，如何禁止检查文件的md5？

在网络环境良好时，禁用md5检查可以极大提升传输速度。若不想在ssh传输文件时检查文件的md5，可将SEALOS_SCP_CHECKSUM环境变量设置为false以禁用此功能。建议将此环境变量设为全局，以便在多场景下使用。

```shell
export SEALOS_SCP_CHECKSUM=false
sealos run labring/kubernetes:v1.24.0
```

## 其他问题

### Q1：image-cri-shim导致端口大量占用，耗尽服务器socket资源？

出现此问题时，可通过以下命令解决：

```shell
wget https://github.com/labring/sealos/releases/download/v4.2.0/sealos_4.2.0_linux_amd64.tar.gz && tar xvf sealos_4.2.0_linux_amd64.tar.gz image-cri-shim
sealos exec -r master,node "systemctl stop image-cri-shim"
sealos scp "./image-cri-shim" "/usr/bin/image-cri-shim"
sealos exec -r master,node "systemctl start image-cri-shim"
sealos exec -r master,node "image-cri-shim -v"
```

### Q2：报错"[ERROR FileAvailable--etc-kubernetes-kubelet.conf]: /etc/kubernetes/kubelet.conf already exists"

此问题可通过升级至Sealos 4.1.7+来解决。

### Q3：报错："function "semverCompare" not defined"

此问题可通过升级至Sealos 4.1.4+来解决。

我们希望这些解答能帮助您解决在使用Sealos过程中遇到的问题。如果还有其他问题，欢迎随时提问。
