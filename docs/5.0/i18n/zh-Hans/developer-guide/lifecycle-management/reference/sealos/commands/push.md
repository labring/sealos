---
sidebar_position: 6
---

# push 上传镜像

`sealos push` 是 Sealos 命令行工具中的一个命令，用于将镜像推送到指定的位置。这个命令在你需要将本地 Docker 镜像推送到远程镜像仓库的时候特别有用。本指南将详细介绍其使用方法。

## 基本用法

基本的 `sealos push` 命令格式如下：

```bash
sealos push IMAGE_ID DESTINATION
```

在上述命令中，`IMAGE_ID` 是你想要推送的镜像的 ID，而 `DESTINATION` 是你想要推送到的位置。 `DESTINATION` 使用 "transport:details" 格式，如果未指定，将复用源 IMAGE 作为 DESTINATION。

在 Sealos 中，传输方式定义了源镜像和目标镜像在复制过程中的格式和位置。以下是 Sealos 支持的各种传输方式：

1. `containers-storage`: 此传输方式用于存储和管理在本地运行的容器。例如，使用 Podman 或 CRI-O 创建的容器的镜像。

2. `dir`: 这种传输方式将镜像存储在本地文件系统的一个目录中，该目录结构符合 OCI 布局。

3. `docker`: 这种传输方式用于与 Docker 注册表进行交互，如 Docker Hub 或任何其他兼容的私有注册表。

4. `docker-archive`: 此传输方式将镜像存储为一个本地的 Docker tar 文件（`.tar`），这是 Docker 的原生格式。

5. `docker-daemon`: 这种传输方式用于与本地 Docker 守护程序交互，可以从 Docker 守护程序中提取镜像，或者将镜像推送到 Docker 守护程序。

6. `oci`: 该传输方式将镜像存储在一个符合 OCI 布局的目录中，它是一种开放的容器镜像格式。

7. `oci-archive`: 这种传输方式将镜像存储为一个本地的 OCI tar 文件（`.tar`）。

8. `ostree`: 这种传输方式将镜像存储在 OSTree 存储库中，这是一种支持原子升级和回滚的文件系统。

9. `sif`: 这是 Singularity SIF 格式，主要用于高性能计算和数据密集型应用。

示例：

- 将一个镜像推送到 Docker 注册表：`sealos push my-image:latest docker://my-registry.example.com/my-image:latest`

- 将一个镜像从 Docker 守护程序导出：`sealos push docker-daemon:my-image:latest dir:/path/to/save/`

- 将一个镜像推送到本地的容器存储：`sealos push my-image:latest containers-storage:my-new-image:latest`

## 示例

例如，你可以使用以下命令将一个镜像推送到 `registry.example.com` 的仓库：

```bash
sealos push my_image_id docker://registry.example.com/my_repository:my_tag
```

## 可选参数

- `--all`: 该参数用于推送清单列表引用的所有镜像。

- `--authfile`: 该参数用于指定身份验证文件的路径。 可以使用 REGISTRY_AUTH_FILE 环境变量进行覆盖。

- `--cert-dir`: 该参数用于指定访问注册表所需的证书的路径。

- `--compression-format`: 该参数用于指定要使用的压缩格式。

- `--compression-level`: 该参数用于指定要使用的压缩级别。

- `--cr-option` 参数是用于控制是否将镜像的自定义资源（Custom Resource，简称 CR）推送到目标镜像仓库的。

  具体来说，这个参数的可选值包括：

  - "yes": 将会把镜像以及其关联的 CR 都推送到目标镜像仓库。

  - "no": 仅推送镜像，而不推送任何 CR。

  - "only": 仅推送 CR，不推送镜像本身。

  - "auto": 根据镜像和 CR 的实际状态自动决定是否推送。例如，如果 CR 有更改或者不存在于目标仓库，就会被推送。

  请注意，这个参数主要在处理包含自定义资源（如 Kubernetes CRD 对象）的镜像时使用，它能够让你更加灵活地控制镜像和 CR 的推送过程。

- `--creds`: 该参数用于访问注册表，使用 `[username[:password]]` 形式。

- `--digestfile`: 该参数在复制图像后，将结果图像的摘要写入文件。

- `-D`, `--disable-compression`: 该参数用于不压缩层。

- `--encrypt-layer`: 该参数用于指定要加密的层，0 索引层索引支持负索引（例如，0 是第一层，-1 是最后一层）。 如果未定义，则在指定 encryption-key 标志时将加密所有层。

- `--encryption-key`: 该参数用于指定加密图像所需的密钥，与加密协议一起使用（例如，jwe:/path/to/key.pem）。

- `-f`, `--format`: 该参数用于指定目标中要使用的清单类型（oci, v2s1, 或 v2s2）（默认是源的清单类型，带回退）。

- `-q`, `--quiet`: 该参数用于在推送图像时不输出进度信息。

- `--remove-signatures`: 该参数用于在推送图像时不复制签名。

- `--retry

`: 该参数用于指定在推送/拉取失败时的重试次数。

- `--retry-delay`: 该参数用于指定在推送/拉取失败时重试之间的延迟。

- `--rm`: 该参数用于在推送成功后删除清单列表。

- `--sign-by`: 该参数用于使用指定的 `FINGERPRINT` 的 GPG 密钥签名图像。

以上就是 `sealos push` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
