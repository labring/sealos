# 介绍

<a href="https://trackgit.com">
  <img src="https://us-central1-trackgit-analytics.cloudfunctions.net/token/ping/kexrkhvqjlzkdiap4zke" alt="trackgit-views" />
</a>

<div align="center">
  <p>
    <b>让云原生简单普及</b>
  </p>
  <div>

[![Awesome](https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg)](https://github.com/labring/sealos)
[![Open in Dev Container](https://img.shields.io/static/v1?label=Dev%20Container&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/labring/sealos)
[![Build Status](https://github.com/labring/sealos/actions/workflows/release.yml/badge.svg)](https://github.com/labring/sealos/actions)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_shield)
[![codecov](https://codecov.io/gh/labring/sealos/branch/main/graph/badge.svg?token=e41ZDcj06N)](https://codecov.io/gh/labring/sealos)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fpostwoman.io&logo=Postwoman)](https://sealyun.com)
[![OSCS Status](https://www.oscs1024.com/platform/badge/labring/sealos.svg?size=small)](https://www.oscs1024.com/project/labring/sealos?ref=badge_small)
[![Chat on Telegram](https://img.shields.io/badge/chat-Telegram-blueviolet?logo=Telegram)](https://t.me/cloudnativer)

  </div>
</div>

---

[Docs](https://sealos.io) | [简体中文](https://www.sealos.io/zh-Hans/)

## sealos 是什么

**sealos 是以 kubernetes 为内核的云操作系统发行版**

早期单机操作系统也是分层架构，后来才演变成 linux windows 这种内核架构，云操作系统从容器诞生之日起分层架构被击穿，未来也会朝着高内聚的"云内核"架构迁移

![](https://user-images.githubusercontent.com/8912557/173866494-379ba0dd-05af-4095-b63d-08f594581c52.png)

- 从现在开始，把你数据中心所有机器想象成一台"抽象"的超级计算机，sealos 就是用来管理这台超级计算机的操作系统，kubernetes 就是这个操作系统的内核！
- 云计算从此刻起再无 IaaS PaaS SaaS 之分，只有云操作系统驱动(CSI CNI CRI 实现) 云操作系统内核(kubernetes) 和 分布式应用组成

## 核心特性

- 管理集群生命周期
  - [x] 快速安装高可用 Kubernetes 集群
  - [x] 添加/删除节点
  - [x] 清理集群、备份与自动恢复等
- 下载和使用完全兼容 OCI 标准的分布式应用
  - [x] OpenEBS, MinIO, Ingress, PostgreSQL, MySQL, Redis 等
- 定制化分布式应用
  - [x] 用 Dockerfile 构建分布式应用镜像，保存所有的依赖
  - [x] 发布分布式应用镜像到 Docker Hub
  - [x] 融合多个应用构建专属的云平台
- sealos desktop
  - [ ] 像使用 win11 一样使用云 (2022.9 惊艳上线)

## 快速开始

> 安装一个高可用的 kubernetes 集群，并用 calico 作为网络插件

这里的 `kubernetes:v1.24.0` 和 `calico:v3.22.1` 就是存在 registry 里的集群镜像，完全兼容 OCI 标准, 当然聪明同学立马想到是不是可以用 flannel，答案是当然！

```shell script
# 下载并安装 sealos, sealos 是个 golang 的二进制工具，直接下载拷贝到 bin 目录即可, release 页面也可下载
$ wget https://github.com/labring/sealos/releases/download/v4.0.0/sealos_4.0.0_linux_amd64.tar.gz \
   && tar zxvf sealos_4.0.0_linux_amd64.tar.gz sealos && chmod +x sealos && mv sealos /usr/bin
# 创建一个集群
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```

> 构建一个自定义集群镜像

见 [构建一个集群镜像](https://www.sealos.io/zh-Hans/docs/examples/build-example-cloudimage)。

> 存储/消息/数据库 等

接下来请不要震惊：

```shell script
sealos run labring/helm:v3.8.2 # 安装helm
sealos run labring/openebs:v1.9.0 # 安装openebs
sealos run labring/minio-operator:v4.4.16 labring/ingress-nginx:4.1.0 \
   labring/mysql-operator:8.0.23-14.1 labring/redis-operator:3.1.4 # 喜欢的话可以把它们写一起
```

然后你就啥都有了。

## 其它链接

- [贡献指南](./CONTRIBUTING.md)
- [开发指南](./DEVELOPGUIDE.md)
- [sealos 3.0（旧版）](https://github.com/labring/sealos/tree/release-v3.3.9#readme) 老版本用户访问这里，4.0 全面掉打老版本，请尽快升级。
- [buildah](https://github.com/containers/buildah) 本着不重复造轮子，sealos 4.0 中使用了大量 buildah 的构建能力，使集群镜像完全兼容容器镜像和 docker registry。
- [sealer](https://github.com/sealerio/sealer) sealos 4.0 中使用了大量 sealer 的能力，使得 Clusterfile 与 sealer 兼容。部分模块中 fork 了 sealer 的代码。

**加入组织: 钉钉群(35371178), [Telegram](https://t.me/gsealyun), QQ 群（98488045）,作者微信：fangnux**

## 开源协议

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_large)
