---
sidebar_position: 7
---

## sealctl

`sealctl` 是一个命令行工具，用于管理和配置SealOS系统。它包括以下几个子命令：

1. `cert`：管理证书，用于生成、查看和更新TLS证书。
2. `cri`：管理容器运行时接口（CRI）配置，例如Docker或containerd。
3. `hostname`：查看或设置系统主机名。
4. `hosts`：管理系统的hosts文件，用于定义静态主机名到IP地址映射。
5. `ipvs`：管理IP虚拟服务器（IPVS）规则，用于负载均衡和代理。
6. `registry`：管理镜像仓库，用于存储容器镜像仓库格式镜像以及镜像仓库管理。
7. `static_pod`：管理静态Pod，可以创建静态Pod的配置。
8. `token`：生成和管理访问令牌，用于授权访问Kubernetes集群。
9. `version`：显示sealctl的版本信息。

通过这些子命令，您可以方便地管理和配置您的SealOS系统，实现对容器、镜像仓库、网络等各个方面的控制。

### cert证书管理命令

`cert` 命令用于生成 Kubernetes 集群所需的证书文件。在 Kubernetes 集群中，证书用于确保组件之间的通信安全，例如 API server、kubelet 和 etcd 等。证书通过 TLS（Transport Layer Security）协议实现加密，以确保数据在传输过程中的保密性和完整性。

`sealctl cert` 命令可以根据提供的参数自动生成证书。这些参数包括节点 IP、节点名称、服务 CIDR、DNS 域以及可选的其他备用名称。通过生成并配置这些证书，您可以确保 Kubernetes 集群的安全通信。



```
cert 命令用于生成 Kubernetes 证书。

参数：
  --alt-names      备用名称，例如 sealos.io 或 10.103.97.2。可以包含多个备用名称。
  --node-name      节点名称，例如 master0。
  --service-cidr   服务网段，例如 10.103.97.2/24。
  --node-ip        节点的 IP 地址，例如 10.103.97.2。
  --dns-domain     集群 DNS 域，默认值为 cluster.local。
  --cert-path      Kubernetes 证书文件路径，默认值为 /etc/kubernetes/pki。
  --cert-etcd-path Kubernetes etcd 证书文件路径，默认值为 /etc/kubernetes/pki/etcd。

示例：
  sealctl cert --alt-names sealos.io --alt-names 10.103.97.2 \
               --node-name master0 --service-cidr 10.103.97.2/24 \
               --node-ip 10.103.97.2 --dns-domain cluster.local

```



### CRI 容器管理命令

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

### hostname 获取操作系统主机名命令

获取操作系统的主机名：

```shell
sealctl hostname
```

示例：

```shell
sealctl hostname
```

执行此命令将返回操作系统的主机名。无需传递任何参数。

### hosts配置管理命令

`hosts` 命令是用于管理操作系统的 hosts 文件。hosts 文件是一个用于解析域名到 IP 地址的文件，通常在本地系统中用于覆盖 DNS 解析。通过修改 hosts 文件，您可以为一个特定的域名分配一个自定义的 IP 地址，而不必依赖 DNS 服务器。

`sealctl hosts` 提供了以下三个子命令来实现 hosts 文件的管理：

1. `list`：列出当前 hosts 文件中的所有条目。
2. `add`：向 hosts 文件中添加一个新的域名与 IP 地址映射。
3. `delete`：从 hosts 文件中删除一个指定的域名与 IP 地址映射。

通过这些子命令，您可以方便地查看、添加和删除 hosts 文件中的映射，从而更好地控制域名到 IP 地址的解析。

1. `sealctl hosts list`：列出当前 hosts 文件中的条目。

   示例：

   ```shell
   sealctl hosts list
   ```



2. `sealctl hosts add`：向 hosts 文件中添加一个新条目。

   参数：

    - `--ip`：IP 地址（必填）
    - `--domain`：域名（必填）

   示例：

   ```shell
   sealctl hosts add --ip 192.168.1.100 --domain example.com
   ```

3. `sealctl hosts delete`：从 hosts 文件中删除一个条目。

   参数：

    - `--domain`：要删除的域名（必填）

   示例：

   ```shell
   sealctl hosts delete --domain example.com
   ```

注意：您可以在任何 `hosts` 子命令后面添加 `--path` 参数来指定 hosts 文件的路径。默认路径为 `/etc/hosts`（Linux 系统）。

示例：

```shell
sealctl hosts list --path /custom/path/hosts
```



### registry保存命令

`registry save` 命令用于将远程的 Docker 镜像拉取到本地并保存在指定的目录中。这对于在离线或者内网环境中部署容器镜像特别有用。它支持两种模式：`default` 和 `raw`。

- `default` 模式会根据解析出的镜像列表自动获取镜像。这些镜像列表来源于 charts 目录、manifests 目录和 images 目录。
- `raw` 模式允许用户直接指定要保存的镜像列表。

在执行 `registry save` 命令时，将自动获取 `sealos login` 认证信息进行仓库认证。

**子命令**

1. `default [CONTEXT]`

   使用默认方式拉取并保存镜像。这种模式会自动解析 `charts` 目录、`manifests` 目录和 `images` 目录以获取镜像列表。

   **使用示例**

 ```shell
 sealctl registry save default my-context
 ```


2. `raw`

   使用原始方式拉取并保存镜像。

   **使用示例**

  ```shell
  sealctl registry save raw --images my-image:latest
  ```

**选项**

以下选项适用于 `save` 命令及其子命令：

- `--max-procs`: 拉取镜像时使用的最大并行进程数。
- `--registry-dir`: 保存镜像的本地目录。
- `--arch`: 镜像的目标架构，例如：`amd64`、`arm64` 等。

对于 `raw` 子命令，还有以下额外选项：

- `--images`: 需要拉取并保存的镜像列表，以逗号分隔。例如："my-image1:latest,my-image2:v1.0"。

**使用文档**

要使用 `sealctl registry save` 命令，请按照以下步骤操作：

1. 根据需要选择子命令（`default` 或 `raw`）。
2. 为子命令提供必要的选项和参数。
3. 执行命令，镜像将从远程仓库拉取并保存到指定的本地目录。

**示例**

保存默认上下文中的镜像：

```shell
sealctl registry save default my-context
```

使用原始方式保存指定镜像：

```shell
sealctl registry save raw --images my-image:latest
```

### ipvs配置管理命令

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

### static-pod管理命令

`static-pod` 命令用于生成静态 Pod，这些 Pod 是由 kubelet 直接管理的，而不是通过 API 服务器。静态 Pod 在某些场景下非常有用，比如设置和管理 Kubernetes 集群中的控制平面组件。

`sealctl static-pod` 命令提供了一种简便的方法，用于生成用于特定目的的静态 Pod 配置文件。目前，它主要支持生成 `lvscare` 静态 Pod，`lvscare` 是一种用于管理 IPVS 规则的工具。

使用 `sealctl static-pod lvscare`，您可以根据指定的参数（如 VIP、主节点地址、镜像名称等）生成 `lvscare` 静态 Pod YAML 文件。然后，该文件可以存储在 kubelet 的静态 Pod 路径下，kubelet 将自动创建和管理相应的 Pod。



**用法**

```shell
sealctl static-pod lvscare [flags]
```

**选项**

- `--vip`: 默认 VIP IP（默认为 "10.103.97.2:6443"）。
- `--name`: 生成 lvscare 静态 Pod 名称。
- `--image`: 生成 lvscare 静态 Pod 镜像（默认为 `sealos.hub:5000/sealos/lvscare:latest`）。
- `--masters`: 生成 master 地址列表。
- `--print`: 是否打印 YAML。

**示例**

生成 lvscare 静态 Pod 文件并打印 YAML：

```shell
sealctl static-pod lvscare --vip 10.103.97.2:6443 --name lvscare --image lvscare:latest --masters 192.168.0.2:6443,192.168.0.3:6443 --print
```

如果没有使用 `--print` 选项，将直接生成配置文件到 `/etc/kubernetes/manifests` 并启用静态 Pod：

```shell
sealctl static-pod lvscare --vip 10.103.97.2:6443 --name lvscare --image lvscare:latest --masters 192.168.0.2:6443,192.168.0.3:6443
```



### token管理命令

`sealctl token` 命令的主要目的是为了生成一个用于连接主节点（master）和工作节点（node）的 token。在 Kubernetes 集群中，当您想要将一个新的工作节点加入到集群时，通常需要提供一个 token 作为身份验证。这个 token 确保只有拥有正确 token 的工作节点才能加入到集群中。

`sealctl token` 命令通过接收配置文件（可选）和证书密钥（可选）作为参数，生成一个用于身份验证的 token。在默认情况下，如果不提供配置文件和证书密钥，命令会使用内置的默认设置来生成 token。

总之，`sealctl token` 命令用于生成一个用于身份验证的 token，允许工作节点安全地加入到 Kubernetes 集群中。使用这个命令可以简化节点加入集群的过程，确保集群的安全性。



**用法**

```shell
sealctl token [config] [certificateKey]
```

**参数**

- `config`: 配置文件（可选）。
- `certificateKey`: 证书密钥（可选）。

**示例**

使用默认参数生成 token：

```shell
sealctl token
```

使用自定义配置文件和证书密钥生成 token：

```shell
sealctl token my-config my-certificate-key
```



## sealos 依赖命令

1. **HostsAdd(ip, host, domain string) error**

   在指定 IP 地址的节点上添加一个新的 hosts 记录。参数包括 IP 地址、主机名和域名。使用`sealos hosts add `命令

2. **HostsDelete(ip, domain string) error**

   删除指定 IP 地址节点上的一个 hosts 记录。参数包括 IP 地址和域名。使用`sealctl hosts delete`命令

3. **Hostname(ip string) (string, error)**

   获取指定 IP 地址节点的主机名。 使用`sealctl hostname`命令

4. **IPVS(ip, vip string, masters []string) error**

   在指定 IP 地址的节点上配置 IPVS，实现负载均衡。参数包括节点 IP 地址、虚拟 IP 地址和主节点 IP 地址列表。 使用`sealctl ipvs`命令

5. **IPVSClean(ip, vip string) error**

   清除指定 IP 地址节点上的 IPVS 配置。参数包括节点 IP 地址和虚拟 IP 地址。 使用`sealctl ipvs`命令

6. **StaticPod(ip, vip, name, image string, masters []string) error**

   在指定 IP 地址的节点上部署一个静态 Pod(lvscare)。参数包括节点 IP 地址、虚拟 IP 地址、Pod 名称、镜像名称和主节点 IP 地址列表。使用`sealctl static-pod lvscare`命令

7. **Token(ip, config, certificateKey string) (string, error)**

   为指定 IP 地址的节点生成一个 token。参数包括节点 IP 地址、配置文件和证书密钥。使用`sealctl token`命令

8. **CGroup(ip string) (string, error)**

   获取指定 IP 地址节点的cri  CGroup 信息。 使用`sealctl cri cgroup`命令

9. **Socket(ip string) (string, error)**

   获取指定 IP 地址节点的 cri Socket 信息。 使用`sealctl cri socket`命令

10. **Cert(ip string, altNames []string, hostIP, hostName, serviceCIRD, DNSDomain string) error**

    为指定 IP 地址的节点生成证书。参数包括节点 IP 地址、备用名称列表、主机 IP 地址、主机名、服务 CIDR 和 DNS 域名。 使用`sealctl cert` 命令

