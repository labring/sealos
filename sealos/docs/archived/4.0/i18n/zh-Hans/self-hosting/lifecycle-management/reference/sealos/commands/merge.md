---
sidebar_position: 6
---

# merge 合并镜像

Sealos 的 `merge` 命令的主要作用是将多个镜像合并为一个。它通过读取各个输入镜像的 Dockerfile，将其中的命令和层次结构合并到一个新的镜像中。这个命令的运行逻辑很像 `build` 命令，许多参数也是相同的。

这个功能在多个镜像有共享层的情况下非常有用，因为它可以减少镜像的大小，节省存储空间。同时，由于合并后的镜像包含了多个镜像的全部功能，所以它可以帮助简化应用部署。

以下是 `sealos merge` 的基本使用示例：

```bash
sealos merge -t new:0.1.0 kubernetes:v1.19.9 mysql:5.7.0 redis:6.0.0
```

在这个示例中，`kubernetes:v1.19.9`、`mysql:5.7.0` 和 `redis:6.0.0` 这三个镜像被合并为一个新的镜像 `new:0.1.0`。

`sealos merge` 命令提供了丰富的选项来定制合并过程，例如 `--all-platforms` 用于尝试为所有基础镜像平台构建镜像，`--build-arg` 用于向构建器提供参数，`--no-cache` 用于禁用现有的缓存镜像，等等。

请注意，`sealos merge` 命令会根据各个输入镜像的 Dockerfile 来构建新的镜像，所以如果输入镜像的 Dockerfile 不兼容，或者有任何构建错误，那么这个命令可能会失败。在使用 `sealos merge` 命令时，请确保你了解每个输入镜像的 Dockerfile，并根据需要进行调整。
