---
sidebar_position: 4
---

# delete 集群节点删除

`sealos delete` 是 Sealos 命令行工具中的一个命令，主要用于从集群中移除节点。本指南将详细介绍其使用方法和选项。

**注意要保证控制节点的个数为奇数个以保证etcd可以正常选举**

## 基本用法

### 删除节点

要从集群中删除节点，可以使用 `--nodes` 选项：

```bash
sealos delete --nodes x.x.x.x
```

在上述命令中，`x.x.x.x` 应替换为你想要删除的节点的 IP 地址。如果不小心删除了错误的节点，可以使用 `sealos add` 命令恢复它：

```bash
sealos add --nodes x.x.x.x
```

### 删除控制节点

要从集群中删除控制节点，可以使用 `--masters` 选项：

```bash
sealos delete --masters x.x.x.x
```

请注意，如果指定了 `--masters` 参数，sealos 将删除你的控制节点。

### 删除控制节点和节点

如果你想同时删除控制节点和节点，可以同时使用 `--masters` 和 `--nodes` 选项：

```bash
sealos delete --masters x.x.x.x --nodes x.x.x.x
sealos delete --masters x.x.x.x-x.x.x.y --nodes x.x.x.x-x.x.x.y
```

## 选项

`sealos delete` 命令提供了以下选项：

- `--cluster='default'`: 执行删除操作应用的集群的名称。默认为 `default`。

- `--force=false`: 可以输入一个 `--force` 标志以强制删除节点。

- `--masters=''`: 要移除的控制节点。

- `--nodes=''`: 要移除的节点。

每个选项后都可以跟随一个参数。

## 使用示例

以下是一个使用示例，该示例删除了 IP 地址为 `192.168.0.2` 的节点：

```bash
sealos delete --nodes 192.168.0.2
```

以上就是 `sealos delete` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
