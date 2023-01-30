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

## 部署 kubernetes cluster

[![asciicast](https://asciinema.org/a/519263.svg)](https://asciinema.org/a/519263?speed=3)


## sealos 是什么

**sealos 是以 kubernetes 为内核的云操作系统发行版**

早期单机操作系统也是分层架构，后来才演变成 linux windows 这种内核架构，云操作系统从容器诞生之日起分层架构被击穿，未来也会朝着高内聚的"云内核"架构迁移

![](https://user-images.githubusercontent.com/8912557/173866494-379ba0dd-05af-4095-b63d-08f594581c52.png)

- 从现在开始，把你数据中心所有机器想象成一台"抽象"的超级计算机，sealos 就是用来管理这台超级计算机的操作系统，kubernetes 就是这个操作系统的内核！
- 云计算从此刻起再无 IaaS PaaS SaaS 之分，只有云操作系统驱动(CSI CNI CRI 实现) 云操作系统内核(kubernetes) 和 分布式应用组成


## sealos 桌面

云端使用电脑，而无需安装任何分布式应用

![](https://user-images.githubusercontent.com/8912557/191533678-6ab8915e-23c7-456e-b0c0-506682c001fb.png)

可以通过下面的屏幕截图进一步了解`sealos`的应用:

<table>
  <tr>
      <td width="50%" align="center"><b>redis on sealos cloud(1)</b></td>
      <td width="50%" align="center"><b>redis on sealos cloud(2)</b></td>
  </tr>
  <tr>
     <td><img src="https://user-images.githubusercontent.com/8912557/196186025-9053295f-4356-42b6-adf2-064a614bca57.png"/></td>
     <td><img src="https://user-images.githubusercontent.com/8912557/196186714-5ab92925-be86-4305-9e46-66dd9dc3edb5.png"/></td>
  </tr>
  <tr>
      <td width="50%" align="center"><b>pgsql on sealos cloud(1)</b></td>
      <td width="50%" align="center"><b>pgsql on sealos cloud(2)</b></td>
  </tr>
  <tr>
     <td><img src="https://user-images.githubusercontent.com/8912557/196185833-1b5c7a35-32e8-4f75-a52f-8b089ccbe8a4.png"/></td>
     <td><img src="https://user-images.githubusercontent.com/8912557/196186330-cf526d0a-46b1-4938-842c-c7a90d79f97e.png"/></td>
  </tr>
</table>

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
- Sealos cloud
  - [x] 支持运行分布式应用程序
  - [x] 拥有完整的公共云功能，可以畅意运行

## 快速开始

> 安装一个高可用的 kubernetes 集群，并用 calico 作为网络插件

这里的 `kubernetes:v1.24.0` 和 `calico:v3.24.1` 就是存在 registry 里的集群镜像，完全兼容 OCI 标准, 当然聪明同学立马想到是不是可以用 flannel，答案是当然！

```shell script
# 下载并安装 sealos, sealos 是个 golang 的二进制工具，直接下载拷贝到 bin 目录即可, release 页面也可下载
$ wget  https://github.com/labring/sealos/releases/download/v4.1.4/sealos_4.1.4_linux_amd64.tar.gz  && \
    tar -zxvf sealos_4.1.4_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin 
# 创建一个集群
sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```


* 已支持的 kubernetes 版本列表: [240+ kubernetes 版本](https://hub.docker.com/r/labring/kubernetes/tags)、 [kubernetes 使用 cri-docker](https://hub.docker.com/r/labring/kubernetes-docker/tags)
* 其他分布式 [应用镜像](https://hub.docker.com/u/labring)

> 运行单个主机

```shell
$ sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 --single
# remove taint
$ kubectl taint node --all node-role.kubernetes.io/control-plane-
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

然后一切准备就绪。

## 使用 cri-docker 镜像

```shell
sealos run labring/kubernetes-docker:v1.20.5-4.1.4 labring/helm:v3.8.2 labring/calico:v3.24.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```

## 其它链接

- [贡献指南](./CONTRIBUTING.md)
- [开发指南](./DEVELOPGUIDE.md)
- [sealosAction](https://github.com/marketplace/actions/auto-install-k8s-using-sealos)
- [sealos 3.0（旧版）](https://github.com/labring/sealos/tree/release-v3.3.9#readme) 老版本用户访问这里，4.0 全面吊打老版本，请尽快升级。
- [buildah](https://github.com/containers/buildah) 本着不重复造轮子，sealos 4.0 中使用了大量 buildah 的构建能力，使集群镜像完全兼容容器镜像和 docker registry。
- [sealer](https://github.com/sealerio/sealer) sealos 4.0 中使用了大量 sealer 的能力，使得 Clusterfile 与 sealer 兼容。部分模块中 fork 了 sealer 的代码。

**加入组织: 钉钉群(35371178), [Telegram](https://t.me/gsealyun), QQ 群（98488045）,作者微信：fangnux**

## 开源协议

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_large)
