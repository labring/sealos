---
sidebar_position: 1
---

# 镜像打包与分发设计

## 背景

当前镜像管理方式有几个问题:

1. registry 模块与 filesystem 耦合，应该单独拆出一个管理模块
2. docker 镜像放在集群镜像里面，会导致集群镜像大小非常大，而且推送到仓库中实际上是有很多多余文件，浪费空间
3. 分发的时候通过 scp 分发非常低效，也会存在部分多余分发的情况
4. 无法充分利用 nydus 的特性对集群镜像分发，需要作一些转换，集成 nydus 方式也不够干净
5. 在线和离线两种场景都把所有东西拉下来，在可以联网的服务上没有这个必要
6. 多架构分发需要自己去判断目标机器系统架构

## 方案设计

### 构建过程

1. Build 的时候对集群镜像里面的 Docker 镜像不作任何处理，以保障集群镜像"很小"
2. CloudImage 完全兼容 OCI

### Save 过程

1. 把之前在 Build 过程中缓存容器镜像的动作后置到 Save 命令中，此时去解析 manifests 目录，chart 目录以及 imageList，然后把容器镜像单独放到 registry 目录
2. 把集群镜像也保存到 registry 目录中
3. Save 的产物就是 registry 目录和一些配置信息的打包

### Run 过程

1. registry module 根据 registry 的配置拉起 registry
2. 根据 CloudImage Name 在所有节点拉取集群镜像
3. 启动 k8s 和 guest
4. kubelet 自动拉起其它镜像
5. 可以利用运行时自身能力去判断多架构并拉取对应架构的镜像

### 加速方案

在此方案基础上就可以直接制作 containerd+nydus 的 runtime 镜像，直接使用 nydus 的能力，同时提升集群镜像与容器镜像的分发速度。
