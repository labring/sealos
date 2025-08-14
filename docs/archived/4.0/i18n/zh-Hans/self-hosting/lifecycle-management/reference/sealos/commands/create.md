---
sidebar_position: 6
---

# create 创建工作目录

`sealos create` 是 Sealos 命令行工具中的一个命令，主要用于在不执行 CMD 的情况下创建集群工作目录，以便审查镜像。本指南将详细介绍其使用方法和选项。

## 基本用法

`sealos create` 命令用于创建集群工作目录，但不实际运行，主要用于调试或测试，它可以输出集群镜像的地址，你可以校验集群镜像内容是否与预期一致。

```bash
sealos create docker.io/labring/kubernetes:v1.24.0
```

在上述命令中，`clustername` 代表你要创建的集群的名称。

## 选项

`sealos create` 命令提供了以下选项：

- `-c, --cluster='default'`: 要创建但不实际运行的集群的名称。默认为 `default`。

- `--platform='linux/arm64/v8'`: 将镜像的操作系统/架构/版本设置为提供的值，而不是主机的当前操作系统和架构（例如 `linux/arm`）。

- `--short=false`: 如果为真，只打印挂载路径。

- `-e, --env=[]`: 指定渲染模板文件时使用的环境变量。

每个选项后都可以跟随一个参数。

## 示例

例如，你可以使用以下命令创建一个名为 `mycluster` 的集群，但不实际运行它：

```bash
sealos create -e registryPort=8443 docker.io/labring/kubernetes:v1.24.0
```

此命令将创建一个镜像名称为 `docker.io/labring/kubernetes:v1.24.0` 的集群工作目录，并输出集群镜像的地址。`-e registryPort=8443` 选项指定了在渲染模板文件时使用的环境变量，其中 `registryPort` 被设置为 `8443`。请注意，这个示例中集群并没有被实际运行。

以上就是 `sealos create` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
