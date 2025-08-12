---
sidebar_position: 8
---

# registry 镜像仓库命令

## Sealos：sealos registry save 命令详解与使用指南

`registry save` 命令用于将远程的 Docker 镜像拉取到本地并保存在指定的目录中。这对于在离线或者内网环境中部署容器镜像特别有用。

在执行 `registry save` 命令时，将自动获取 `sealos login` 认证信息进行仓库认证。

**使用说明**

1. 使用context自动获取镜像

   使用默认方式拉取并保存镜像。这种模式会自动解析 `charts` 目录、`manifests` 目录和 `images` 目录以获取镜像列表。

   **使用示例**

 ```shell
 sealos registry save --registry-dir=/tmp/registry1 my-context
 ```


2. 指定镜像列表方式

   使用参数传入镜像列表

   **使用示例**

  ```shell
  sealos registry save --registry-dir=/tmp/registry2 --images=docker.io/library/busybox:latest
  ```

**选项**

以下选项适用于 `save` 命令及其子命令：

- `--max-procs`: 拉取镜像时使用的最大并行进程数。
- `--registry-dir`: 保存镜像的本地目录。
- `--arch`: 镜像的目标架构，例如：`amd64`、`arm64` 等。
- `--images`: 需要拉取并保存的镜像列表，以逗号分隔。例如："my-image1:latest,my-image2:v1.0"。

## Sealos：sealos registry serve 命令详解与使用指南

在管理 Docker 镜像仓库过程中，Sealos 提供了 `sealos registry serve` 命令以方便用户进行相关操作。本文将详细介绍 `sealos registry serve` 命令的使用方法和示例。

### 基本介绍

`sealos registry serve` 命令的主要作用是启动一个 Docker 分发镜像仓库服务器，支持两种模式：`filesystem` 和 `inmem`。

1. **Filesystem 模式**：在此模式下，sealctl 将运行一个针对指定目录的 Docker 分发镜像仓库服务器。该模式下，镜像数据将存储在硬盘上。

2. **In-memory 模式**：在此模式下，sealctl 将运行一个内存中的 Docker 分发镜像仓库服务器。该模式下，镜像数据仅保存在内存中，进程退出后数据将丢失。

### 命令参数

`sealos registry serve filesystem ` 命令支持以下参数：

- `--disable-logging`: 禁用日志输出，默认为 false。
- `--log-level`: 配置日志级别，默认为 'error'。
- `-p, --port`: 服务器监听的端口，默认为随机未使用的端口。

### 使用示例

以下是一些 `sealos registry serve` 命令的使用示例：

#### 在文件系统中启动镜像仓库服务器

```bash
sealos registry serve filesystem --port=5000
```

以上命令将在端口5000上启动一个文件系统镜像仓库服务器。

#### 在内存中启动镜像仓库服务器

```bash
sealos registry serve inmem 
```

以上命令将启动一个内存镜像仓库服务器。该服务器在进程退出后，存储的数据将丢失。

通过 `sealctl registry serve` 命令，用户可以轻松地管理和操作 Docker 镜像仓库。无论是在开发环境，还是在生产环境中，它都是一个强大且易用的工具。


## Sealos：sealos registry passwd 命令详解与使用指南

在管理 Docker 镜像仓库过程中，Sealos 提供了 `sealos registry passwd` 命令以方便用户对集群registry进行密码修改。它提供了一种简便的方法，帮助用户修改 registry 的密码。

### 基本用法

使用 `sealos registry passwd` 命令来修改registry的密码。

```bash
sealos registry passwd
```

### 参数

以下是 `sealos registry passwd` 命令的参数：

- `-c, --cluster-name`：集群名称，默认为'default'。

- `-f, --cri-shim-file-path`：镜像 cri shim 文件路径，如果为空将不会更新镜像 cri shim 文件。默认路径为'/etc/image-cri-shim.yaml'。

- `-p, --htpasswd-path`：registry 密码文件路径。默认路径为'/etc/registry/registry_htpasswd'。

### 使用步骤

1. 执行 `sealos registry passwd` 命令，可以根据需要指定参数来进行配置。

2. 根据命令提示，输入新的密码。

3. 命令执行成功后，registry 的密码将被修改为新的密码。

### 演示说明

[![asciicast](https://asciinema.org/a/Qu05jah4ZZmjMuFR4vHEKvBsQ.svg)](https://asciinema.org/a/Qu05jah4ZZmjMuFR4vHEKvBsQ)

**在使用过程中,会让用户选择registry类型**

- registry: 二进制启动，执行`systemctl restart registry`进行重启镜像仓库。
- containerd: containerd启动，执行"nerdctl restart sealos-registry"进行重启镜像仓库。
- docker: docker启动，执行"docker restart sealos-registry"进行重启镜像仓库。

### 注意事项

**修改 registry 密码后,修改Clusterfile中的registry密码**
修改 registry 密码后，所有使用该 registry 的节点和服务都需要更新配置，以使用新的密码进行身份验证。否则，它们将无法从该 registry 拉取或推送镜像。

如果你不确定如何更新节点和服务的配置，建议在修改 registry 密码之前，先查阅相关文档或者寻求专业的技术支持。

## Sealos：`sealos registry sync` 命令详解与使用指南

Sealos 的 `registry sync` 命令可帮助您在两个 registry 之间同步所有镜像。这不仅可以用于镜像的迁移，还可以备份您的镜像。

### 命令基本用法

执行 `sealos registry sync` 命令来进行镜像同步：

```bash
sealos registry sync source dst
```

这里的 `source` 表示源 registry 的地址，而 `dst` 是目标 registry 的地址。

例如，您想将地址为 127.0.0.1:41669 的 registry 中的所有镜像同步到地址为 sealos.hub:5000 的 registry，您应执行以下命令：

```bash
sealos registry sync 127.0.0.1:41669 sealos.hub:5000
```

### 认证与权限

在执行 `sealos registry sync` 命令之前，请确保您具有访问源 registry 和目标 registry 的权限。可以使用`sealos login`对registry进行认证登录。

### 同步过程

请注意，镜像同步可能需要一些时间，这取决于镜像的数量和大小，以及网络的速度。在同步过程中，请保持网络的连通性，并确保在同步完成之前不要中断命令的执行。

重要的是，`sealos registry sync` 命令支持增量同步，已经存在于目标 registry 的镜像不会重新同步。

### 参数选项

`sealos registry sync` 命令还提供了一些参数选项，允许您更精细地控制同步过程：

- `--override-arch ARCH`：使用指定的 `ARCH` 替代当前机器的架构来选择镜像。

- `--override-os OS`：使用指定的 `OS` 替代当前操作系统来选择镜像。

- `--override-variant VARIANT`：使用指定的 `VARIANT` 替代当前的架构变种来选择镜像。

- `-a` 或 `--all`：如果源镜像是一个列表，同步所有镜像。这对异构环境下特别有用，因为默认情况下，只会同步当前架构的镜像。

例如，如果您想同步所有架构的镜像，可以添加 `-a` 参数：

```bash
sealos registry sync -a 127.0.0.1:41669 sealos.hub:5000
```

以上就是 `sealos registry sync` 命令的详细说明与使用指南。希望这些信息能帮助您更好地理解和使用这个命令。如果您在使用过程中遇到任何问题，欢迎随时提问。

## Sealos：`sealos registry copy` 命令详解与使用指南

Sealos 的 `registry copy` 命令用于将指定镜像从一个 registry 复制到另一个 registry。这能帮助您在不同的 registry 之间进行镜像的迁移或备份。

### 命令基本用法

使用 `sealos registry copy` 命令来进行镜像的复制：

```bash
sealos registry copy source-image dst
```

这里的 `source-image` 表示源镜像的全名（包括地址和镜像名），`dst` 是目标 registry 的地址。

例如，要将名为 `127.0.0.1:41669/my-image:tag` 的镜像复制到地址为 `sealos.hub:5000` 的 registry，您可以执行以下命令：

```bash
sealos registry copy 127.0.0.1:41669/my-image:tag sealos.hub:5000
```

### 认证与权限

在执行 `sealos registry copy` 命令之前，请确保您具有访问源镜像和目标 registry 的权限。可以使用`sealos login`对registry进行认证登录。

### 复制过程

请注意，镜像复制可能需要一些时间，这取决于镜像的大小，以及网络的速度。在复制过程中，请保持网络的连通性，并确保在复制完成之前不要中断命令的执行。

### 参数选项

`sealos registry copy` 命令提供了一些参数选项，允许您更精细地控制复制过程：

- `--override-arch ARCH`：使用指定的 `ARCH` 替代当前机器的架构来选择镜像。

- `--override-os OS`：使用指定的 `OS` 替代当前操作系统来选择镜像。

- `--override-variant VARIANT`：使用指定的 `VARIANT` 替代当前的架构变种来选择镜像。

- `-a` 或 `--all`：如果源镜像是一个列表，复制所有镜像。这对异构环境下特别有用，因为默认情况下，只会复制当前架构的镜像。

例如，如果您想复制所有架构的镜像，可以添加 `-a` 参数：

```bash
sealos registry copy -a 127.0.0.1:41669/my-image:tag sealos.hub:5000
```


以上就是 `sealos registry` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
