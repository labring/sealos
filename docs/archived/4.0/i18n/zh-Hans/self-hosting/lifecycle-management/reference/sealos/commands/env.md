---
sidebar_position: 7
---

# env 环境变量

`sealos env` 是 Sealos 命令行工具中的一个命令，用于展示目前sealos支持的环境变量以及当前的环境变量值。

## 基本用法

### 查看环境变量

要查看环境变量，可以使用 `sealos env` 命令：

```bash
sealos env
```

### 查看环境变量以及说明

要查看环境变量以及说明，可以使用 `sealos env -v` 命令：

```bash
sealos env -v
```


## 如何设置环境变量

```shell
BUILDAH_LOG_LEVEL=debug sealos images
```

```shell
SEALOS_REGISTRY_SYNC_EXPERIMENTAL=true sealos build -t xxx .
```


以上就是 `sealos env` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
