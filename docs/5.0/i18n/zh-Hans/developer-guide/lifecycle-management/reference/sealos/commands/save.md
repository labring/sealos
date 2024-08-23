---
sidebar_position: 6
---

# save 保存镜像

`sealos save` 是 Sealos 命令行工具中的一个命令，用于将镜像保存到归档文件中。这个命令可以帮助你方便地备份和迁移你的镜像。本指南将详细介绍其使用方法。

## 基本用法

基本的 `sealos save` 命令格式如下：

```bash
sealos save -o outputFilename imageName
```

在上述命令中，`outputFilename` 是你想要保存的归档文件的名称，`imageName` 是你想要保存的镜像的名称。

## 示例

例如，你可以使用以下命令将名为 `labring/kubernetes:latest` 的镜像保存到一个名为 `kubernetes.tar` 的归档文件中：

```bash
sealos save -o kubernetes.tar labring/kubernetes:v1.24.0
```

## 可选参数

-  `--format`: 这个参数用于指定保存镜像的传输方式。目前可用的选项有 `oci-archive` 和 `docker-archive`、`oci-dir`,`docker-dir`。默认值是 `oci-archive`。
- `-m`:  这个参数可以同时保存多个镜像，但是仅限于`docker-archive`格式。

例如，你可以使用以下命令将名为 `labring/kubernetes:latest` 的镜像以 `docker-archive` 的方式保存到一个名为 `kubernetes.tar` 的归档文件中：

```bash
sealos save -o kubernetes.tar --format docker-archive labring/kubernetes:v1.24.0
sealos save -o kubernetes.tar -m --format docker-archive labring/kubernetes:v1.24.0 labring/helm:v3.5.0
```

以上就是 `sealos save` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
