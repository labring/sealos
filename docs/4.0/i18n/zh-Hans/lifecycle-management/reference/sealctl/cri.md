---
sidebar_position: 2
---

# CRI 容器管理

`cri` 命令是用于管理和检查 Kubernetes 集群中的容器运行时（Container Runtime Interface，CRI）环境。容器运行时是负责运行容器的底层技术，如 Docker、containerd 或者 CRI-O 等。在 Kubernetes 中，容器运行时用于启动、停止和管理容器，以支持集群中的工作负载。

`sealctl cri` 命令提供了一组子命令，使您能够执行与容器运行时相关的各种操作，例如检查运行时是否是 Docker、是否正在运行，列出 Kubernetes 容器，删除容器，拉取镜像，检查镜像是否存在以及获取 CGroup 驱动信息等。

通过使用 `sealctl cri` 命令，您可以轻松地管理和检查 Kubernetes 集群中的容器运行时环境，确保其正确配置和正常运行。



```shell
sealctl cri [flags]
```



子命令：

1. `socket`：检测 CRI 套接字。

```shell
sealctl cri socket
```

2. `cgroup-driver`：获取容器运行时的 cgroup 驱动。

```shell
sealctl cri cgroup-driver [--short]
```

- `--short`：仅打印结果。

全局参数：

- `--socket-path`：CRI 套接字路径。
- `--config`：CRI 配置文件。

示例：

```shell
sealctl cri socket
sealctl cri cgroup-driver --short

```