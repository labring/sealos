---
sidebar_position: 6
---

# tag 添加镜像名称

`sealos tag` 是 Sealos 命令行工具中的一个命令，用于给本地存储的镜像添加一个或多个附加名称。这个命令可以帮助你更好地管理你的镜像。本指南将详细介绍其使用方法。

## 基本用法

基本的 `sealos tag` 命令格式如下：

```bash
sealos tag imageName newName
```

在上述命令中，`imageName` 是你要操作的镜像的名称，`newName` 是你想要添加的新标签。

## 示例

例如，你可以使用以下命令给名为 `imageName` 的镜像添加一个新的名称 `firstNewName`：

```bash
sealos tag imageName firstNewName
```

你也可以一次添加多个名称，例如，添加 `firstNewName` 和 `SecondNewName` 两个名称：

```bash
sealos tag imageName firstNewName SecondNewName
```

以上就是 `sealos tag` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
