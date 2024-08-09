---
sidebar_position: 5
---

# exec 执行命令

`sealos exec` 是 Sealos 命令行工具中的一个命令，用于在指定的集群节点上执行 Shell 命令或脚本。本指南将详细介绍其使用方法和选项。

## 基本用法

基本的 `sealos exec` 命令格式如下：

```bash
sealos exec "shell command or script"
```

在上述命令中，`shell command or script` 是你要在集群节点上执行的 Shell 命令或脚本。

## 选项

`sealos exec` 命令提供了以下选项：

- `-c, --cluster='default'`: 要在其上执行命令的集群的名称。默认为 `default`。

- `--ips=[]`: 在具有指定 IP 地址的节点上运行命令。

- `-r, --roles='':`: 在具有指定角色的节点上运行命令。目前支持 master,node,registry

每个选项后都可以跟随一个或多个参数。

## 示例

例如，你可以使用以下命令在默认集群的所有节点上查看 `/etc/hosts` 文件的内容：

```bash
sealos exec "cat /etc/hosts"
```

如果你想在名为 `my-cluster` 的集群的 `master` 和 `node` 角色的节点上查看 `/etc/hosts` 文件的内容，可以使用以下命令：

```bash
sealos exec -c my-cluster -r master,node "cat /etc/hosts"
```

如果你只想在 IP 地址为 `172.16.1.38` 的节点上查看 `/etc/hosts` 文件的内容，可以使用以下命令：

```bash
sealos exec -c my-cluster --ips 172.16.1.38 "cat /etc/hosts"
```

以上就是 `sealos exec` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
