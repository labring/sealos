---
sidebar_position: 6
---

# ipvs 管理

`ipvs` 命令用于创建和管理本地的 IPVS 负载均衡。IPVS（IP Virtual Server）是 Linux 内核中的一个模块，它允许在内核空间实现高性能的负载均衡。`ipvs` 命令通过管理虚拟服务器和真实服务器的映射关系，实现对服务的负载均衡。

`sealctl ipvs` 支持以下功能：

1. 创建和管理虚拟服务器 (virtual server) 和真实服务器 (real server) 的映射关系。
2. 提供健康检查功能，定期检查真实服务器的健康状态，并根据需要对其进行上下线操作。
3. 支持两种代理模式：`route` 和 `link`。
4. 支持配置代理调度算法（如轮询、加权轮询等）。
5. 支持一次性创建代理规则（`--run-once` 标志）或持续运行并管理代理规则。
6. 支持清理功能：通过 `-C` 或 `--clean` 标志，可以清除现有的 IPVS 规则并退出。

通过 `sealctl ipvs` 命令，用户可以轻松地在本地创建和管理高性能的负载均衡服务。

**用法**

```shell
sealctl ipvs [flags]
```

**选项**

- `-C`, `--clean`: 清除现有规则，然后退出。
- `--health-insecure-skip-verify`: 跳过不安全请求的验证（默认为 true）。
- `--health-path string`: 用于探测的 URL 路径（默认为 "/healthz"）。
- `--health-req-body string`: 健康检查器发送的请求体。
- `--health-req-headers stringToString`: HTTP 请求头（默认为 []）。
- `--health-req-method string`: HTTP 请求方法（默认为 "GET"）。
- `--health-schem string`: 探测器的 HTTP 方案（默认为 "https"）。
- `--health-status ints`: 有效状态码。
- `-h`, `--help`: ipvs 帮助。
- `-i`, `--iface string`: 要创建的虚拟接口的名称，与 kube-proxy 的行为相同（默认为 "lvscare"）。仅在 mode=link 时启用。
- `--interval durationOrSecond`: 健康检查间隔（默认为 0s）。
- `--ip ip`: 作为路由网关的目标 IP，与 route 模式一起使用。
- `--logger string`: 日志级别：DEBG/INFO（默认为 "INFO"）。
- `--masqueradebit int`: IPTables masquerade 位。仅在 mode=link 时启用。
- `--mode string`: 代理模式：route/link（默认为 "route"）。
- `--rs strings`: 真实服务器地址，例如 192.168.0.2:6443。
- `--run-once`: 创建代理规则并退出。
- `--scheduler string`: 代理调度器（默认为 "rr"）。
- `--vs string`: 虚拟服务器地址，例如 169.254.0.1:6443。

**全局选项**

- `--debug`: 启用调试日志。
- `--show-path`: 启用显示代码路径。

**使用文档**

要使用 `sealctl ipvs` 命令，请按照以下步骤操作：

1. 为命令提供必要的选项和参数。
2. 执行命令，将创建或管理本地 IPVS 负载均衡。

**示例**

创建代理规则并退出：

```shell
sealctl ipvs --vs 169.254.0.1:6443 --rs 192.168.0.2:6443 --run-once
```

清除现有 IPVS 规则：

```shell
sealctl ipvs --clean
```
