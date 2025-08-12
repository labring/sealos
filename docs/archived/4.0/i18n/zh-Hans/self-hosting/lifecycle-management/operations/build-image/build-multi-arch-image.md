---
sidebar_position: 0
---

# 构建支持多架构的集群镜像

本文将介绍如何使用 `sealos` 工具构建支持多架构（如 amd64 和 arm64）的 集群 镜像，并将其推送到容器镜像仓库。

## 步骤说明

### 构建镜像

首先，我们分别为 amd64 和 arm64 两种架构构建镜像。使用 `sealos build` 命令，指定镜像标签（包括前缀和版本），平台（使用 `--platform` 参数），Dockerfile（使用 `-f` 参数）和上下文路径：

```shell
$ sealos build -t $prefix/oci-kubernetes:$version-amd64 --platform linux/amd64   -f Kubefile  .
$ sealos build -t $prefix/oci-kubernetes:$version-arm64 --platform linux/arm64   -f Kubefile  .
```

在这里，`$prefix` 代表你的镜像仓库地址和命名空间，`$version` 是你的镜像版本。

### 登录容器镜像仓库

然后，我们需要登录到容器镜像仓库，以便之后能够推送镜像。使用 `sealos login` 命令，指定用户名，密码和仓库域名：

```shell
$ sealos login --username $username --password $password $domain
```

### 推送镜像

接下来，我们将刚才构建的两个镜像推送到容器镜像仓库。使用 `sealos push` 命令，指定镜像标签：

```shell
$ sealos push $prefix/oci-kubernetes:$version-amd64
$ sealos push $prefix/oci-kubernetes:$version-arm64
```

### 创建和推送镜像清单

最后，我们需要创建一个包含这两个镜像的镜像清单，并将其推送到容器镜像仓库。这个清单可以使 Docker 或 Kubernetes 在拉取镜像时，自动选择与运行环境架构匹配的镜像：

```shell
$ sealos manifest create $prefix/oci-kubernetes:$version
$ sealos manifest add $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version-amd64
$ sealos manifest add $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version-arm64
$ sealos manifest push --all $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version
```

至此，支持多架构的 集群镜像就构建完成了。在实际使用时，需要根据你的容器镜像仓库地址和命名空间，以及镜像版本，替换上述命令中的 `$prefix` 和 `$version`。