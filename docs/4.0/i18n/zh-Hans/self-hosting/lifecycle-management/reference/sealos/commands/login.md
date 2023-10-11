---
sidebar_position: 6
---

# login 登录仓库

`sealos login` 命令用于在指定服务器上登录容器注册表。登录注册表后，你可以拉取、推送镜像。

## 用法：

`sealos login [flags] [options] registryName` 

## 参数：

以下是 `sealos login` 命令的参数：

- `--authfile=''`: 身份验证文件的路径。可以使用环境变量 REGISTRY_AUTH_FILE 来覆盖。

- `--cert-dir=''`: 使用指定路径的证书来访问镜像仓库。

- `--get-login=true`: 返回注册表的当前登录用户。

- `-k, --kubeconfig=''`: 使用 kubeconfig 登录到 sealos 镜像仓库 hub.sealos.io。

- `-p, --password=''`: 注册表的密码。

- `--password-stdin=false`: 从标准输入获取密码。

- `-u, --username=''`: 注册表的用户名。

- `-v, --verbose=false`: 将更详细的信息写入标准输出。

## 示例：

- 登录到 quay.io 注册表：`sealos login -u myusername -p mypassword quay.io `

注意，在使用 `sealos login` 命令时，你需要确保提供了正确的用户名和密码，否则登录过程可能会失败。如果你在登录过程中遇到问题，你可能需要检查你的用户名和密码，以确保它们没有输入错误或被遗忘。

以上就是 `sealos login` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
