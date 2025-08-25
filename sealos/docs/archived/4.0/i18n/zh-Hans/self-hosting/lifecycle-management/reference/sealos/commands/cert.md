---
sidebar_position: 3
---

# cert 更新集群证书

`sealos cert` 是 Sealos 命令行工具中的一个命令，主要用于在集群中更新 API 服务器的证书。本指南将详细介绍其使用方法和选项。

## 基本用法

要在证书中添加域名或 IP，可以使用 `--alt-names` 选项：

```bash
sealos cert --alt-names sealos.io,10.103.97.2,127.0.0.1,localhost
```

在上述命令中，`sealos.io,10.103.97.2,127.0.0.1,localhost` 应替换为你想要添加的域名和 IP 地址。

**注意**：在执行此操作之前，你最好先备份旧的证书。

执行 `sealos cert` 命令后，会更新集群 API 服务器的证书，你无需手动重启 API 服务器，sealos会自动帮你重启服务。

## 选项

`sealos cert` 命令提供了以下选项：

- `--alt-names=''`: 在证书中添加域名或 IP，例如 `sealos.io` 或 `10.103.97.2`。

- `-c, --cluster='default'`: 要执行 exec 操作的集群的名称。默认为 `default`。

每个选项后都可以跟随一个参数。

## 校验证书

更新证书后，你可以使用以下命令进行校验：

```bash
kubectl -n kube-system get cm kubeadm-config -o yaml
openssl x509 -in /etc/kubernetes/pki/apiserver.crt -text
```

上述命令将获取 kube-system 命名空间中的 kubeadm-config 配置映射，并显示 apiserver.crt 证书的详细信息。

以上就是 `sealos cert` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
