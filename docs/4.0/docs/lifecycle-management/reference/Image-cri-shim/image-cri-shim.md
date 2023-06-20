---
sidebar_position: 3
---

# image-cri-shim 使用指南

## 工作原理

image-cri-shim 是一个基于 CRI (Container Runtime Interface) 和 kubelet 的 gRPC (Google Remote Procedure Call) shim。CRI 是 Kubernetes 中用于与容器运行时进行交互的接口，而 kubelet 是负责维护容器运行状态和节点级别的资源管理的 Kubernetes 组件。

image-cri-shim 的主要功能是自动识别镜像名称，让用户在使用 Kubernetes 部署容器时无需手动指定镜像名称。这样可以降低用户的操作难度，提高部署容器的便利性。

在实际使用中，image-cri-shim 可以作为一个中间件，接收来自 kubelet 的请求，然后将请求转发给容器运行时。通过自动识别镜像名称，image-cri-shim 可以简化容器镜像的部署流程，减轻用户的操作负担。

```
+------------+         +----------------+         +-------------------+
|   User     |         |  Kubelet       |         |   image-cri-shim  |
| (Kubernetes|         | (Node agent)   |         |   (Middleware)    |
|  Manifest) |         |                |         |                   |
+-----+------+         +-------+--------+         +-------+-----------+
      |                        |                          |
      | YAML Manifest          |                          |
      |--------------->        |                          |
      |                        |                          |
      |                        |                          |
      |                        |   CRI Request            |
      |                        |------------------------> |
      |                        |                          |
      |                        |   Image Name             |
      |                        |   Auto-Recognition       |
      |                        |                          |
      |                        |                          |
      |                        |   CRI Response           |
      |                        | <------------------------+
      |                        |                          |
      |                        |                          |
      |          Container     |                          |
      |          Deployment    |                          |
      | <----------------------|                          |
      |                        |                          |
      |                        |                          |
+------------+         +-------+--------+         +-------+-----------+

```

从上述流程图可以看出，用户创建一个包含容器信息的 Kubernetes YAML 清单，然后将该清单提交给 kubelet。kubelet 是 Kubernetes 节点上的代理，负责管理容器。
接着，kubelet 将 CRI 请求发送给 image-cri-shim 中间件。image-cri-shim 的主要任务是自动识别镜像名称，它会处理这个 CRI 请求并获取相关的镜像信息。当 image-cri-shim 识别到镜像名称后，它会将 CRI 响应返回给 kubelet。

最后，kubelet 使用从 image-cri-shim 获取的镜像名称来部署容器。这个过程对用户是透明的，用户无需手动指定镜像名称，从而简化了容器部署流程并提高了便利性。

## 架构图

image-cri-shim 的架构如下图所示：

![](images/image-cri-shim.png)


## 使用说明

```yaml
shim: /var/run/image-cri-shim.sock
cri: /run/containerd/containerd.sock
address: http://sealos.hub:5000
force: true
debug: true
timeout: 15m
auth: admin:passw0rd

registries:
- address: http://172.18.1.38:5000
  auth: admin:passw0rd
```
这段配置文件是一个用于设置 image-cri-shim 的 YAML 格式文件。配置文件中包含了一些关键的参数，以下是每个参数的解释：

1. shim: 指定 image-cri-shim 的 UNIX 套接字文件路径。这个路径用于与 kubelet 之间的通信。
2. cri: 指定容器运行时（如 containerd）的 UNIX 套接字文件路径。image-cri-shim 会使用这个路径与容器运行时进行通信。
3. address: 定义镜像仓库的地址。在本例中，镜像仓库地址为 http://sealos.hub:5000。
4. force: 设置为 true 时，image-cri-shim 会在强制启动shim,无需等待cri启动后启动。
5. debug: 设置为 true 时，启用调试模式，输出更多的日志信息。
6. timeout: 定义镜像操作的超时时间。在本例中，超时时间为 15 分钟（15m）。
7. auth: 定义用于访问镜像仓库的身份验证凭据。在本例中，用户名为 admin，密码为 passw0rd。

此外，配置文件还包含了一个 registries 列表，用于定义其他镜像仓库及其身份验证凭据。在这个例子中，只有一个其他仓库：
- address: 该仓库的地址为 http://172.18.1.38:5000。
- auth: 用于访问该仓库的身份验证凭据。在本例中，用户名为 admin，密码为 passw0rd。
这个配置文件为 image-cri-shim 提供了所需的信息，以便正确地与 kubelet 和容器运行时（如 containerd）进行通信，以及访问和管理镜像仓库。

注意: image-cri-shim 能够同时兼容 CRI API v1alpha2 和 v1。

### 管理服务

image-cri-shim 通常作为一个系统服务运行。要管理 image-cri-shim，您可以使用系统服务管理工具（如 systemctl）来启动、停止、重启或查看服务状态。首先，确保您已经正确地安装了 image-cri-shim 并将其配置为一个系统服务。

1. 启动服务： `systemctl start image-cri-shim`
2. 停止服务： `systemctl stop image-cri-shim`
3. 重启服务： `systemctl restart image-cri-shim`
4. 查看服务状态： `systemctl status image-cri-shim`

### 日志管理

要查看 image-cri-shim 服务的日志，您可以使用 journalctl 命令。journalctl 是一个用于查询和显示系统日志的工具，它与 systemd 服务管理器一起使用。

以下是使用 journalctl 查看 image-cri-shim 服务日志的命令：

```shell
journalctl -u image-cri-shim
```

这将显示 image-cri-shim 服务的全部日志。如果您希望实时查看日志，可以添加 -f 参数：

```shell
journalctl -u image-cri-shim -f
```

此外，您还可以根据时间过滤日志。例如，如果您只想查看过去一小时的日志，可以使用以下命令：

```shell
journalctl -u image-cri-shim --since "1 hour ago"
```

这些命令应该能帮助您查看和分析 image-cri-shim 服务的日志，从而更好地了解服务的运行状态和可能出现的问题。
