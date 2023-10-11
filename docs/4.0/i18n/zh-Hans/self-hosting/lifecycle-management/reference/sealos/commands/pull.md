---
sidebar_position: 6
---

# pull 拉取镜像

`sealos pull` 是一个非常有用的命令，它可以从容器镜像仓库下载镜像并将其存储在本地。用户可以通过镜像的标签（tag）或摘要（digest）来获取镜像。如果没有指定标签，那么会默认下载带有 'latest' 标签（如果存在）的镜像。

通过使用这个命令，用户可以方便地从远程仓库下载所需的镜像，极大地提高了工作效率。

## 用法:

`sealos pull [flags] [options] imageName` 

## 参数:

以下是 `sealos pull` 命令的参数：

- `-a, --all-tags=false`: 下载仓库中所有带有标签的镜像。

- `--authfile=''`: 认证文件的路径。可以使用环境变量 REGISTRY_AUTH_FILE 进行覆盖。

- `--cert-dir=''`: 用于访问镜像仓库的证书的指定路径。

- `--creds=''`: 使用 `[username[:password]]` 访问镜像仓库。

- `--decryption-key=[]`: 解密镜像所需要的密钥。

- `--platform=[linux/arm64/v8]`: 选择镜像时，优先使用指定的 OS/ARCH，而不是当前操作系统和架构。

- `--policy='missing'`: 设置策略，可选的值包括 'missing', 'always', 'never'。

- `-q, --quiet=false`: 在拉取镜像时，不输出进度信息。

- `--remove-signatures=false`: 在拉取镜像时，不复制签名。

- `--retry=3`: 在拉取失败时的重试次数。

- `--retry-delay=2s`: 拉取失败时，重试之间的延迟。

## 示例:

- 拉取一个镜像：`sealos pull my-image:latest`

- 从 Docker 守护进程拉取一个镜像：`sealos pull docker-daemon:my-image:tag`

- 从特定的仓库拉取一个镜像：`sealos pull myregistry/myrepository/my-image:tag`

- 拉取多个镜像：`sealos pull imageID1 imageID2 imageID3`

以上就是 `sealos push` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
