---
sidebar_position: 4
---

# add 集群节点添加

`sealos add` 是 Sealos 命令行工具中的一个命令，主要用于向集群中添加节点。本指南将详细介绍其使用方法和选项。

**注意要保证控制节点的个数为奇数个以保证etcd可以正常选举**

## 基本用法

### 添加节点

要向集群中添加节点，可以使用 `--nodes` 选项：

```bash
sealos add --nodes x.x.x.x
```

在上述命令中，`x.x.x.x` 应替换为你想要添加的节点的 IP 地址。

### 添加控制节点

要向集群中添加控制节点，可以使用 `--masters` 选项：

```bash
sealos add --masters x.x.x.x
```

### 同时添加控制节点和节点

如果你想同时向集群中添加控制节点和节点，可以同时使用 `--masters` 和 `--nodes` 选项：

```bash
sealos add --masters x.x.x.x --nodes x.x.x.x
sealos add --masters x.x.x.x-x.x.x.y --nodes x.x.x.x-x.x.x.y
```

## 选项

`sealos add` 命令提供了以下选项：

- `--cluster='default'`: 要执行加入操作的集群的名称。默认为 `default`。

- `--masters=''`: 要加入的主节点。

- `--nodes=''`: 要加入的节点。

每个选项后都可以跟随一个参数。

## 使用示例

以下是一个使用示例，该示例向集群中添加了 IP 地址为 `192.168.0.2` 的节点：

```bash
sealos add --nodes 192.168.0.2
```

以上就是 `sealos add` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
