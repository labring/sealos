---
sidebar_position: 2
---

# reset 重置集群

`sealos reset` 是 Sealos 命令行工具中的一个命令，用于重置整个集群。这个命令在你想要彻底清空集群数据或者重建集群的时候特别有用。本指南将详细介绍其使用方法。

## 基本用法

基本的 `sealos reset` 命令格式如下：

```bash
sealos reset --cluster cluster_name
```

在上述命令中，`cluster_name` 是你想要重置的集群的名称。

## 示例

例如，你可以使用以下命令重置名为 `mycluster` 的集群：

```bash
sealos reset --cluster mycluster
```

## 可选参数

- `--force`: 该参数用于强制重置集群，即使集群重置操作未能成功完成。

```bash
sealos reset --cluster mycluster --force
```

- `--masters`: 该参数用于指定要重置的 master 节点。

```bash
sealos reset --cluster mycluster --masters master1
```

- `--nodes`: 该参数用于指定要重置的工作节点。

```bash
sealos reset --cluster mycluster --nodes node1 node2
```

- `-p`, `--passwd`: 该参数用于提供密码进行身份验证。

- `-i`, `--pk`: 该参数用于指定用于公钥认证的身份（私钥）读取的文件。

- `--pk-passwd`: 该参数用于解密 PEM 编码私钥的口令。

- `--port`: 该参数用于指定要连接的远程主机的端口。

- `-u`, `--user`: 该参数用于指定要作为身份验证的用户名。

```bash
sealos reset --cluster mycluster --user username --pk /root/.ssh/id_rsa --pk-passwd yourpassword
```

以上就是 `sealos reset` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。