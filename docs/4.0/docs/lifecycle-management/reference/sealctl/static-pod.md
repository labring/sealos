---
sidebar_position: 7
---

# static-pod 配置

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
