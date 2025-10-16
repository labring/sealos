---
sidebar_position: 6
---

# manifest 镜像清单

Sealos 的 `manifest` 命令用于创建、修改和推送 manifest 列表和镜像索引。这些功能主要用于处理镜像的多架构支持。在 Docker 和 OCI 镜像规范中，manifest 列表（也被称为 "fat manifest"）或镜像索引允许一个镜像标签（如 `myimage:latest`）在多种硬件架构（如 amd64, arm64, ppc64le 等）上都能使用。

以下是一些主要的 `manifest` 子命令：

1. `create`：创建新的 manifest 列表或镜像索引。例如：`sealos manifest create localhost/list`
2. `add`：将镜像添加到 manifest 列表或镜像索引中。例如：`sealos manifest add localhost/list localhost/image`
3. `annotate`：在 manifest 列表或镜像索引的条目中添加或更新信息。例如：`sealos manifest annotate --annotation A=B localhost/list localhost/image`
4. `inspect`：显示 manifest 列表或镜像索引的内容。例如：`sealos manifest inspect localhost/list`
5. `push`：将 manifest 列表或镜像索引推送到 registry。例如：`sealos manifest push localhost/list transport:destination`
6. `remove` 和 `rm`：从 manifest 列表或镜像索引中移除条目，或者完全删除 manifest 列表或镜像索引。例如：`sealos manifest remove localhost/list sha256:entryManifestDigest` 或 `sealos manifest rm localhost/list`

通过 `sealos manifest` 命令，可以灵活地管理 manifest 列表或镜像索引，为多架构的 Docker 或 OCI 镜像提供支持。用户可以根据自己的需求，创建自定义的 manifest 列表，方便在不同的硬件架构上部署和运行 Docker 镜像。

用户如果想通过manifest命令构建多架构镜像，可以参考文档[构建支持多架构的集群镜像](/self-hosting/lifecycle-management/operations/build-image/build-multi-arch-image.md)
