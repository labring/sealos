---
sidebar_position: 6
---

# rmi 删除本地镜像

`sealos rmi` 是 Sealos 命令行工具中的一个命令，用于删除本地存储的一个或多个镜像。这个命令可以帮助你清理无用或者过时的镜像，节省存储空间。本指南将详细介绍其使用方法。

## 基本用法

基本的 `sealos rmi` 命令格式如下：

```bash
sealos rmi imageID
```

在上述命令中，`imageID` 是你想要删除的镜像的 ID。

## 示例

例如，你可以使用以下命令删除 ID 为 `imageID` 的镜像：

```bash
sealos rmi imageID
```

如果你想要删除多个镜像，只需要在命令行中列出所有的镜像 ID，例如：

```bash
sealos rmi imageID1 imageID2 imageID3
```

## 可选参数

- `-a`, `--all`: 该参数用于删除所有镜像。使用此选项时，命令将不接受任何镜像 ID。

```bash
sealos rmi --all
```

- `-f`, `--force`: 该参数用于强制删除镜像，以及使用该镜像的任何容器。

```bash
sealos rmi --force imageID
```

- `-p`, `--prune`: 该参数用于修剪悬挂的镜像（没有标签且没有被任何容器引用的镜像）。

```bash
sealos rmi --prune
```

以上就是 `sealos rmi` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
