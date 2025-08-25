---
sidebar_position: 0
---

# Sealos 命令说明

## 集群管理命令

- `apply`：使用 Clusterfile 在 Kubernetes 集群内运行集群镜像。
- `cert`：更新 Kubernetes API 服务器的证书。
- `run`：轻松运行云原生应用。
- `reset`：重置集群中的所有内容。
- `status`：查看 Sealos集群 的状态。

## 节点管理命令

- `add`：将节点添加到集群中。
- `delete`：从集群中删除节点。

## 远程操作命令

- `exec`：在指定节点上执行 shell 命令或脚本。
- `scp`：将文件复制到指定节点的远程位置。

## 实验性命令

- `registry`：与镜像仓库相关的命令。

## 容器和镜像命令

- `build`：使用 Sealfile 或 Kubefile 中的指令构建镜像。
- `create`：创建集群，但不运行 CMD，用于检查镜像。
- `inspect`：检查容器或镜像的配置。
- `images`：列出本地存储中的镜像。
- `load`：从文件中加载镜像。
- `login`：登录到容器仓库。
- `logout`：登出容器仓库。
- `manifest`：操作清单列表和镜像索引。
- `merge`：合并多个镜像为一个。
- `pull`：从指定位置拉取镜像。
- `push`：将镜像推送到指定的目标。
- `rmi`：从本地存储中删除一个或多个镜像。
- `save`：将镜像保存到存档文件中。
- `tag`：为本地镜像添加一个附加名称。

## 其他命令

- `completion`：为指定的 shell 生成自动补全脚本。
- `docs`：生成 API 参考。
- `env`：打印 Sealos 使用的所有环境信息。
- `gen`：生成具有所有默认设置的 Clusterfile。
- `version`：打印版本信息。

Sealos 的 `--debug` 参数是一个全局参数，用于开启调试模式，以便在出现问题时能更详细地了解系统的运行情况。

有关安装说明，请参见[下载 Sealos 命令行工具](/self-hosting/lifecycle-management/quick-start/install-cli.md)； 如需安装 Kubernetes 集群，请参见[安装 Kubernetes 集群](/self-hosting/lifecycle-management/quick-start/deploy-kubernetes.md)。