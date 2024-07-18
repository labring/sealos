---
sidebar_position: 6
---

# logout 登出仓库

`sealos logout` 命令用于在指定服务器上移除本地缓存的镜像仓库的账号和密码。

## 用法：

`sealos logout [flags] [options] registryName` 

## 参数：

以下是 `sealos logout` 命令的参数：

- `--authfile=''`: 身份验证文件的路径。可以使用环境变量 REGISTRY_AUTH_FILE 来覆盖。

- `-a, --all=false`:  删除所有的认证信息。


## 示例：

- 登出到 quay.io 镜像仓库：`sealos logout quay.io `

以上就是 `sealos logout` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
