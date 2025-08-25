---
sidebar_position: 5
---

# registry 镜像仓库

## Sealos：sealctl registry serve 命令详解与使用指南

在构建并管理 Docker 镜像仓库过程中，Sealos 提供了 `sealctl registry serve` 命令以方便用户进行相关操作。本文将详细介绍 `sealctl registry serve` 命令的使用方法和示例。

### 基本介绍

`sealctl registry serve` 命令的主要作用是启动一个 Docker 分发镜像仓库服务器，支持两种模式：`filesystem` 和 `inmem`。

1. **Filesystem 模式**：在此模式下，sealctl 将运行一个针对指定目录的 Docker 分发镜像仓库服务器。该模式下，镜像数据将存储在硬盘上。**该命令还用于sealos做增量镜像同步**

2. **In-memory 模式**：在此模式下，sealctl 将运行一个内存中的 Docker 分发镜像仓库服务器。该模式下，镜像数据仅保存在内存中，进程退出后数据将丢失。

### 命令参数

`sealctl registry serve filesystem ` 命令支持以下参数：

- `--disable-logging`: 禁用日志输出，默认为 false。
- `--log-level`: 配置日志级别，默认为 'error'。
- `-p, --port`: 服务器监听的端口，默认为随机未使用的端口。

### 使用示例

以下是一些 `sealctl registry serve` 命令的使用示例：

#### 在文件系统中启动镜像仓库服务器

```bash
sealctl registry serve filesystem --port=5000
```

以上命令将在端口5000上启动一个文件系统镜像仓库服务器。

#### 在内存中启动镜像仓库服务器

```bash
sealctl registry serve inmem 
```

以上命令将启动一个内存镜像仓库服务器。该服务器在进程退出后，存储的数据将丢失。

通过 `sealctl registry serve` 命令，用户可以轻松地管理和操作 Docker 镜像仓库。无论是在开发环境，还是在生产环境中，它都是一个强大且易用的工具。

