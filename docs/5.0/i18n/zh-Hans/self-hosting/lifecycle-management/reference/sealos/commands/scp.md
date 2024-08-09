---
sidebar_position: 5
---

# scp 拷贝文件

`sealos scp` 是 Sealos 命令行工具中的一个命令，用于将文件复制到指定的集群节点。本指南将详细介绍其使用方法和选项。

## 基本用法

基本的 `sealos scp` 命令格式如下：

```bash
sealos scp "source file path" "destination file path"
```

在上述命令中，`source file path` 是你要复制的文件的本地路径，`destination file path` 是你要将文件复制到的远程节点路径。

## 选项

`sealos scp` 命令提供了以下选项：

- `-c, --cluster='default'`: 要将文件复制到其上的集群的名称。默认为 `default`。

- `--ips=[]`: 将文件复制到具有指定 IP 地址的节点。

- `-r, --roles='':`: 将文件复制到具有指定角色的节点。

每个选项后都可以跟随一个或多个参数。

## 示例

例如，你可以使用以下命令将本地的 `/root/aa.txt` 文件复制到默认集群的所有节点的 `/root/dd.txt`：

```bash
sealos scp "/root/aa.txt" "/root/dd.txt"
```

如果你想在名为 `my-cluster` 的集群的 `master` 和 `node` 角色的节点上复制文件，可以使用以下命令：

```bash
sealos scp -c my-cluster -r master,node "/root/aa.txt" "/root/dd.txt"
```

如果你只想在 IP 地址为 `172.16.1.38` 的节点上复制文件，可以使用以下命令：

```bash
sealos scp -c my-cluster --ips 172.16.1.38 "/root/aa.txt" "/root/dd.txt"
```

以上就是 `sealos scp` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
