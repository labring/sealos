---
sidebar_position: 2
---

# 离线环境安装

离线环境只需要提前导入镜像，其它步骤与在线安装一致。

首先在有网络的环境中 save 安装包：
```shell
$ sealos pull labring/kubernetes:v1.25.0
$ sealos save -o kubernetes.tar labring/kubernetes:v1.25.0
```

拷贝 kubernetes.tar 到离线环境, 使用 load 命令导入镜像即可：

```shell
$ sealos load -i kubernetes.tar
```

剩下的安装方式与在线安装一致。
```shell
$ sealos images # 查看集群镜像是否导入成功
$ sealos run kuberentes:v1.25.0 --single # 单机安装，集群安装同理
```
