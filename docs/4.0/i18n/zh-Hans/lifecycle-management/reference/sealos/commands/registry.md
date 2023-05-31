---
sidebar_position: 8
---

# registry容器镜像仓库命令

## SealOS：sealos registry save 命令详解与使用指南

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

## SealOS：sealos registry serve 命令详解与使用指南

在构建并管理 Docker 镜像仓库过程中，SealOS 提供了 `sealos registry serve` 命令以方便用户进行相关操作。本文将详细介绍 `sealos registry serve` 命令的使用方法和示例。

## 基本介绍

`sealos registry serve` 命令的主要作用是启动一个 Docker 分发镜像仓库服务器，支持两种模式：`filesystem` 和 `inmem`。

1. **Filesystem 模式**：在此模式下，sealctl 将运行一个针对指定目录的 Docker 分发镜像仓库服务器。该模式下，镜像数据将存储在硬盘上。

2. **In-memory 模式**：在此模式下，sealctl 将运行一个内存中的 Docker 分发镜像仓库服务器。该模式下，镜像数据仅保存在内存中，进程退出后数据将丢失。

## 命令参数

`sealos registry serve filesystem ` 命令支持以下参数：

- `--disable-logging`: 禁用日志输出，默认为 false。
- `--log-level`: 配置日志级别，默认为 'error'。
- `-p, --port`: 服务器监听的端口，默认为随机未使用的端口。

## 使用示例

以下是一些 `sealos registry serve` 命令的使用示例：

### 在文件系统中启动镜像仓库服务器

```bash
sealos registry serve filesystem --port=5000
```

以上命令将在端口5000上启动一个文件系统镜像仓库服务器。

### 在内存中启动镜像仓库服务器

```bash
sealos registry serve inmem 
```

以上命令将启动一个内存镜像仓库服务器。该服务器在进程退出后，存储的数据将丢失。

通过 `sealctl registry serve` 命令，用户可以轻松地管理和操作 Docker 镜像仓库。无论是在开发环境，还是在生产环境中，它都是一个强大且易用的工具。
