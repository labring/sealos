---
sidebar_position: 1
---

# 镜像构建与标准化目录配置

在开展 Sealos 镜像构建任务前，我们建议先构建一个符合规范的目录结构。这样能够使构建过程更加规范，易于管理，同时也能降低出错率。这篇文章将详细指导你如何创建这样一个目录结构，并解释每个目录的用途。

## 目录结构示例

一个完整的、符合规范的目录结构示例如下：

```shell
.
├── charts
│   └── nginx
│       ├── Chart.lock
│       ├── charts
│       ├── Chart.yaml
│       ├── README.md
│       ├── templates
│       ├── values.schema.json
│       └── values.yaml
├── images
│   └── shim
│       └── nginxImages
├── init.sh
├── Kubefile
├── manifests
│   └── nginx
│       ├── deployment.yaml
│       ├── ingress.yaml
│       └── service.yaml
├── opt
│   └── helm
└── registry
```

## 目录描述

每个目录在构建过程中都扮演着特定的角色，以下是他们的详细描述：

- `Kubefile` (必需)：这个文件类似于 Dockerfile，是构建镜像的核心文件。它定义了构建过程中的各个步骤，如基础镜像选择、环境变量设置、文件复制等。
- `manifests`：这个目录用于存放 Kubernetes 的 yaml 文件，这些文件描述了你的应用的配置信息，如 Pod、Service、Deployment 的配置。
- `charts`：这个目录用于存放 Helm chart 文件，Helm chart 是 Kubernetes 的一个包管理工具，可以简化 Kubernetes 应用的部署和管理。
- `images/shim`：这个目录用于存放无法从 yaml 文件或 Helm chart 中自动提取的镜像。在构建过程中，sealos 将自动拉取这些镜像。
- `opt`：二进制文件存储在这里。
- `registry`：这个目录用于存放构建过程中拉取到本地的镜像。在构建过程中，该目录将自动生成，无需手动创建。
- `init.sh`：这个脚本在构建过程中由 GitHub Action 自动运行，你可以在这个脚本中编写一些自动化的工作，如初始化环境、预处理数据等。([cluster-image](https://github.com/labring-actions/cluster-image)的规则)

## Kubefile 参数

`Kubefile` 文件是镜像构建的核心，它支持多种参数，以下是这些参数的详细解析：

```shell
FROM labring/kubernetes:v1.24.0
ENV version v1.1.0
COPY manifests ./manifests
COPY registry ./registry
ENTRYPOINT ["kubectl apply -f manifests/tigera-operator.yaml"]
CMD ["kubectl apply -f manifests/custom-resources.yaml"]
```

各个参数的描述：

- `FROM`：这个指令用于设置构建的基础镜像，所有的构建步骤都基于这个镜像进行。
- `LABEL`: `LABEL`定义一些sealos集群镜像的内部配置。

  - `check` 集群镜像运行前的一些检查脚本操作
  - `clean` 集群reset或者节点删除的清理脚本
  - `clean-registry` 集群reset时候的清理镜像仓库的脚本
  - `image` 集群的lvscare镜像地址（sealos的IPVS镜像）
  - `init` 集群初始化的脚本
  - `init-registry` 集群初始化时启动容器镜像仓库的脚本
  - `sealos.io.type` 集群镜像类型，目前主要是rootfs、application和patch。
    - rootfs 是运行集群的基础镜像，比如kubernetes、kubernetes-docker这种包含镜像、二进制等集群所需的。（**每个节点都需要存在**）
    - application 是应用镜像，比如calico、helm、istio等应用服务的镜像。(**只存储到master0节点**)
    - patch是在rootfs镜像后需要调整的，是另一种修改rootfs镜像的方式（**还有一种方式是Config方式**），它会覆盖默认的集群运行的第一个镜像。

  - `sealos.io.version` 镜像的版本号，目前开启的是v1beta1
  - `version` 集群的版本号，当前是kubernetes的版本号
  - `vip` 是VIP的地址，为修改IPVS的虚IP使用

- `ENV`：`ENV`指令将环境变量`<key>`设置为值`<value>`。（rootfs中默认会有一些默认的环境变量，可以修改rootfs中一些默认参数，比如镜像仓库的账号密码、docker、containerd的存储目录等等）

    具体的集群镜像需要具体查看，`sealos inspect`镜像看一下对应的环境变量，不同版本的镜像略有不同。

  - SEALOS_SYS_CRI_ENDPOINT:  当前集群镜像的criSocket (不同类型集群镜像可能不同)
  - criData:  cri的数据目录
  - defaultVIP: 默认的VIP地址
  - disableApparmor: 是否禁用apparmor (containerd有这个问题)
  - registryConfig:  容器镜像仓库的配置目录
  - registryData: 容器镜像仓库的数据目录（因为是目录进行了挂载，其实这个配置没有实际意义，它实际还是存储在/var/lib/sealos下面）
  - registryDomain: 默认镜像仓库的域名
  - registryPassword: 默认镜像仓库的密码
  - registryPort:  默认镜像仓库的密码
  - registryUsername: 默认镜像仓库的账户
  - sandboxImage: 默认cri启动的sandbox_image。（无需写repo只需要写镜像名称，eg: pasue:3.7）
- `COPY`：`COPY`指令从`<src>`复制新的文件或目录，并将它们添加到容器的文件系统路径`<dest>`上。(**注意，需要把registry目录进行拷贝，否则集群没有容器镜像**)
- `ENTRYPOINT`：这个指令用于设置镜像的启动命令，当镜像启动时，这条命令会被执行。
- `CMD`：这个指令也用于设置镜像的启动命令，但它与 ENTRYPOINT 指令的区别在于，如果用户在运行镜像时（`sealos run --cmd`）提供了启动命令，CMD 指令中的命令将会被覆盖。

在构建过程中，Sealos 还会自动设置一些内置的环境变量，包括（前缀为'SEALOS_SYS'的环境变量无法被修改）：

- SEALOS_SYS_KUBE_VERSION：Kubernetes的版本号，例如 v1.26.0
- SEALOS_SYS_SEALOS_VERSION：Sealos的版本号，例如 4.1.3
