<a href="https://trackgit.com">
  <img src="https://us-central1-trackgit-analytics.cloudfunctions.net/token/ping/kexrkhvqjlzkdiap4zke" alt="trackgit-views" />
</a>

![](https://socialify.git.ci/fanux/sealos/image?description=1&font=Source%20Code%20Pro&forks=1&language=1&pattern=Charlie%20Brown&stargazers=1&theme=Light)

<div align="center">
  <p>
    <b>让云原生简单普及!</b>
  </p>
  <p>

  [![Awesome](https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg)](https://github.com/labring/sealos)
  [![Build Status](https://github.com/labring/sealos/actions/workflows/release.yml/badge.svg)](https://github.com/labring/sealos/actions)
  [![Website](https://img.shields.io/website?url=https%3A%2F%2Fpostwoman.io&logo=Postwoman)](https://sealyun.com)
  [![Go Report Card](https://goreportcard.com/badge/github.com/labring/sealos)](https://goreportcard.com/report/github.com/labring/sealos)
  [![Chat on Telegram](https://img.shields.io/badge/chat-Telegram-blueviolet?logo=Telegram)](https://t.me/gsealyun)

  </p>
</div>

---

**文档: _[官方文档](https://www.sealyun.com), [English Docs](/README_en.md), [博客](https://fuckcloudnative.io)_**

**加入组织: 钉钉群(35371178), [Telegram](https://t.me/gsealyun), QQ群（98488045）,作者微信：fangnux** 

## sealos 是什么

**sealos 是以kubernetes为内核的云操作系统发行版**

早期单机操作系统也是分层架构，后来才演变成 linux windows这种内核架构，云操作系统从容器诞生之日起分层架构被击穿，未来也会朝着高内聚的"云内核"架构迁移

![](https://user-images.githubusercontent.com/8912557/162092037-82b1fc5b-cf55-4224-8266-c1c6a989a602.png)

* 从现在开始，把你数据中心所有机器想象成一台"抽象"的超级计算机，sealos就是用来管理这台超级计算机的操作系统，kubernetes就是这个操作系统的内核！
* 云计算从此刻起再无IaaS PaaS SaaS之分，只有云操作系统驱动(CSI CNI CRI实现) 云操作系统内核(kubernetes) 和 分布式应用组成

> 核心能力

* 集群镜像 - 实现整个集群的Build Ship Run，把docker的理念衍生到集群纬度，实现任意分布式软件的自由定义一键运行
* hub.sealos - 集群镜像仓库，这里你可以找到绝大多数已经制作好的分布式应用如kubernetes基础集群镜像，pgsql高可用集群镜像，minio高可用集群镜像等
* desktop.sealos - 云操作系统的桌面，并非传统意义上的云桌面，它长得像macOS但是管理的集群和分布式应用
* 分布式应用矩阵 - 也就是各种你需要用的存储/网络/高可用数据库/消息队列/监控等，所有这些只需要点下鼠标或者sealos run即可获得

## sealos 愿景

* 让所有企业使用基于kubernetes的云操作系统像使用macOS一样简单
* 让任何人都可以用一条命令或动动鼠标即可构建复杂的云服务
* 让所有企业只需要雇佣一个实习生即可维护整个云
* 让所有企业能拥有更开放的AWS, 公有云与私有云可以有完全一致性的体验
* 让任何分布式软件都可以一键在系统中运行并实现自运维

## sealos 能干啥

* 对集群生命周期进行管理，一键安装高可用kubernetes集群，增删节点清理集群自恢复等
* 通过sealos hub 下载和使用完全兼容OCI标准的各种分布式软件如openebs,minio,ingress,pgsql,mysql,redis等
* 通过sealos desktop 像使用macOS一样管理整个集群，以及管理系统上跑的分布式应用
* sealos 可以管理kubernetes但并不是一个kubernetes管理器, 而是一个抽象的云操作系统。要管理kubernetes下载一个对应管理应用即可。
* sealos 可以安装kubernetes但是并不是一个安装工具，安装只是sealos 的一个boot的最基本的能力。

## sealos 适合谁用

* 小白用户 - 针对小白连kubernetes单词也不会拼写的人也可以通过命令或者图形界面完全无障碍使用sealos，获取一些需要的软件，如点击一下即可获得一个高可用数据库。
* SaaS应用开发者 - 你可能需要的也是一个数据库,一个高可用消息队列或者一个开发环境，一条命令即可让你获得所需要的服务。你也不想关心底层如何实现，你只要结果。
* 集群维护者 - 你可能很懂kubernetes，sealos市场里提供各种管理应用如lens官方dashboard等等，针对极客还提供webterminal, 各种云原生生态软件监控系统也是信手拈来。
* 云操作系统开发者 - 你可能很擅长operator开发，那么恭喜你可以编写sealos的应用，并提交到sealos hub上供其他所有用户使用你的产品。
* 私有云交付人员 - sealos集群镜像机制可以保证在离线环境中的高度一致性，是私有云交付之王，也能极好的封装SaaS应用，实现一键交付到客户环境中。
* 企业用户 - 你可以直接使用sealos公有云服务，也可以分钟级在自己的机房中运行出一个一模一样的私有云为整个企业提供服务, 还可以把sealos运行到各大公有云IaaS上，再也不用受厂商绑定之苦，想切就切。

## sealos 为什么不一样

> kubernetes是手段不是目的

对于大众用户来说kubernetes并不重要，重要的是kubernetes上面跑了什么东西，这些东西才是用户最终关心的，中间过程并不关心。
当然熟悉kubernetes的极客不用担心，你同样会有非常好的使用体验。

> 化整为零，不同的应用，不同的形态

sealos 最简单的版本几乎不包含任何东西，除了最最基本的集群镜像的能力，其它能力几乎都是通过应用云扩展的，最基础的sealos除了一个很"裸"的kuberentes不包含其他任何东西。
这使得sealos可以很简单，也可以很强大，可以个人使用，也可以服务公有云这种庞大的多租户应用场景，可以在一台机器上玩，也可以在数千台服务器上大规模运行。

> 包容性

意味着不管你是什么样的喜好都可以在sealos上得到完美使用体验，比如以CI/CD场景为例，有些用户喜欢drone 有些喜欢argo，这两类用户只需要自己安装不同应用即可，sealos不会深度集成某一款CI/CD工具
用户自由的安装卸载。

sealos不会追求系统上分布式应用风格的统一，就像macOS上的office软件和Email软件不可能一致一样，这样的好处是给不同的分布式软件最大发挥空间，不然sealos会花非常大的代价让他们统一，一旦某个技术
被淘汰意味着极大的替换成本。

sealos也不会追求各种软件账户信息的统一，因为不同的分布式软件有不同账户管理方式，这些管理方式对其应用自身的适配性是最强的。

> 不同的用户不同的使用方式

和macOS很类似，普通大众用户用图形界面，开发者终端敲敲命令，系统应用开发者调用system API
sealos的大众用户用GUI或者简单的一键使用，云原生从业者kubectl 各种dashboard 所有apiserver, 开发者直接基于kubernetes开发operator

> 简单不失强大

sealos提供的是最基础的系统框架，其强大的能力都由上层应用提供，sealos的职责是管理好这些应用，所以系统复杂度不会随着功能的增加而变复杂。

## sealos 实践案例

Boss：我司需要紧跟云原生浪潮，需要构建一个基于kubernetes云平台，要有存储，要有paas，要有ci/cd，还要有云开发，还要有数据库，还要有。。。xx总监你来评估一下成本

CTO(掰掰手指头): kubernetes 3人，存储专家 1人，开发1人，paas 3人， ci/cd 3人， 云开发5人， 运维3人。。。  老板我仅需要15人 给我半年就做出来！

众人议论纷纷，此时角落传来一个声音：

小张(默默举手): 我了解一个开源软件，貌似一键就可以搞定，小张共享了一下屏幕，默默敲下：

```shell script
sealos run kubernetes:v1.24.0 openebs:v1.9.0 mysql:v8.0 minio:v4.4.16 ingress:v4.1.0 laf:v0.8.0
       -m 192.168.0.2 -n 192.168.0.3 -p 123456
```

会没结束，任务完成。。。

后面的故事大家都知道了，除了小张 CTO往下都被裁了。。。

## 快速开始

> 安装一个高可用的kubernetes集群，并用calico作为网络插件

这里的 `kubernetes:v1.24.0` 和 `calico:v3.22.1` 就是存在registry里的集群镜像，完全兼容OCI标准, 当然聪明同学立马想到是不是可以用flannel，答案是当然！

```shell script
# 下载并安装sealos, sealos是个golang的二进制工具，直接下载拷贝到bin目录即可, release页面也可下载
wget -c https://sealyun-home.oss-cn-beijing.aliyuncs.com/sealos-4.0/latest/sealos-amd64 -O sealos && \
    chmod +x sealos && mv sealos /usr/bin
# 创建一个集群
sealos run kubernetes:v1.24.0 calico:v3.22.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```

> 构建一个自定义集群镜像

[构建一个ingress集群镜像](https://github.com/labring/sealos/blob/main/docs/4.0/build-example-ingress-helm.md)

> 存储/消息/数据库 等

接下来请不要震惊：

```shell script
sealos run helm:v3.8.2 # 安装helm
sealos run openebs:v1.9.0 # 安装openebs
sealos run minio-operator:v4.4.16 ingress-nginx:4.1.0 \
   mysql-operator:8.0.23-14.1 redis-operator:3.1.4 # 喜欢的话可以把它们写一起
```

然后你就啥都有了

## 其它链接

* [sealos 3.0 老版本](https://github.com/labring/sealos/tree/release-v3.3.9#readme) 老版本用户访问这里，4.0全面掉打老版本，请尽快升级。
* [buildah](https://github.com/containers/buildah) 本着不重复造轮子，sealos 4.0中使用了大量buildah的构建能力，使集群镜像完全兼容容器镜像和docker registry。
