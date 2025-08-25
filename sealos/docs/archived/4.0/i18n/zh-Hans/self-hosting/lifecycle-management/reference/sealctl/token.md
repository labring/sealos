---
sidebar_position: 8
---

# token 管理

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

