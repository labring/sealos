---
slug: sealos is unique
title: sealos is unique
authors: [fanux]
tags: [kubernetes,sealos]
---

# sealos 与其它流行产品的差异与联系

## sealos 与 helm

- helm 并不关心 kubernetes 集群生命周期的管理，但是 sealos 关心，sealos boot 模块整个云操作系统启动伸缩升级清理都会处理.
- helm 关心编排不关心打包，helm 里面依赖的 docker 镜像如何交付 helm 不关心，sealos 是把分布式应用的所有依赖打包.
- helm 不会内嵌一个 kuberentes, 但是 sealos 会，这样保证整个集群整体的一致性.
- helm 如果你的分布式应用里面依赖一些非容器化的二进制，helm 不会打包这些依赖而 sealos 会.
- sealos 内嵌一个私有镜像仓库来存放集群中所有需要用到的 docker 镜像，helm 并没有.

Best Practise: 最佳实践是配合 helm 与 sealos 使用，用 helm 编排 用 sealos 打包整个集群, 和应用所有的依赖.
Example: [Building an ingress cluster images](https://github.com/labring/sealos/blob/main/docs/4.0/docs/lifecycle-management/quick-start/build-ingress-cluster-image.md)

## sealos 与 kubeadm

严格来说应该是 sealos 的 boot 模块与 kubeadm, boot 模块和 kubedam 都是用户管理集群生命周期的.

boot 的底层调用了 kubeadm 的能力，两者是相互配合的关系， sealos boot 也可以扩展其它的方式安装集群，如 二进制实现，boot 还

可以扩展其它运行时的能力，如支持 k3s k0s 这样的其它 kubernetes 轻量级发行版。

kubeadm 的能力：

* 安装 kubernetes 集群
* 增删节点、升级、清理集群等

为什么在此基础之上还需要封装一层 sealos boot:

1. kubeadm 没有给默认的 LB方案解决 HA 问题，所以 sealos 实现了 lvscare 让集群高可用
2. kubeadm 更适合在线安装，没有处理好依赖，特别是二进制和依赖镜像，而 sealos 所有东西都放到集群镜像中了
3. kubeadm 整个安装步骤是面向过程的，基本是 环境预设->安装二进制和kubelet->kubeadm init->kubeadm join 这个过程，而 sealos 一条命令面向结果
4. kubeadm 的证书写死在源码中，还是需要额外组件续期等，sealos 重写这部分逻辑彻底解决这个问题
5. sealos 封装了 ssh scp 等操作，不再需要登录到各机器上
6. sealos 适合超大规模集群的快速安装，kubeadm 直接使用会不太方便，有过多手工操作

所以 sealos boot 是在 kubeadm 基础上让安装体验做到极致.

# sealos 与 rancher kubesphere

rancher 和 kubesphere 是非常优秀的基于 kubernetes 的 PaaS 平台，或者 kubernetes 的管理器，

这类产品的主要特性：

* kubernetes 的可视化管理，暴露原生大量的 kubernetes 的概念，如 service deployment pod 等
* 集成 CI/CD 能力，如 kubesphere 继承 jenkins
* 集成微服务能力，如 rancher 继承 istio
* 集成监控系统能力
* 也有应用市场，是一些生态中其它的云原生化组件

特点是大而全，一站式服务，对使用人员的专业性要求比较高，基本定位给熟悉云原生的开发与运维人员使用。

是把 kubernetes 当成目的设计思路，产品功能与能力非常具体。

sealos 的设计理念是 "化整为零，自由组装，大道至简"，利用 kubernetes 的能力使用非常简单的方式提供给用户真正想要的东西。

如何理解这句话：

> 可大可小，可简单可强大

- sealos 可以非常简单，可以简单到只安装最干净的 kubernetes, 其它什么也不带，非常干净。
- sealos 简单不意味着功能弱，可以通过 sealos run 几十款应用来组装一个能力非常强的云。
- sealos 可以在小到2C4G的机器上跑测试，也可以在大到数千台的数据中心中运行。

> 用户真正需要的是什么？

操作系统的特点是用户需要什么它就是什么，极其灵活，不会给用户带来额外负担。

如 windows 对于一个游戏玩家来说就是个游戏机, 对于程序员来说就是用来写代码的工具，对于美工来说就是用来修图的。
操作系统的形态取决于使用者是谁，装了什么应用。

那 sealos 云操作系统也一样，sealos 本身通过 sealos core, sealos hub, sealos desktop 把分布式应用管理好即可，
剩下一切能力让应用层去扩展。

- sealos core: 实现一个多租户的内核，相当于给 kubernetes patch 管理好租户和应用
- sealos hub: 应用的提供者和使用者相互协作的地方，提供者发布应用，使用者使用应用
- sealos CLI API desktop: 一些应用使用入口，如图形界面入口

再看用户群体：

> 大众用户

随便做个开发者调查，你会发现懂 kubernetes 的不会超过 5%，即便是在大厂撑死也不会超过 10%，所以可以认为大众用户是不懂 kubernetes 的

但是他们又特别需要云原生的能力，比如绝大多数应用开发者都绕不开一个需求：提供一个高可用的数据库给他们。

此时：sealos run mysql-HA:v8.0 搞定了，再告诉用户访问地址和密码，整个过程完全感知不到 kubernetes 内核的存在，这才是友好体验。

有 sealos desktop 就更简单了，像安装微信一样安装 mysql 集群.

> 云原生用户

很多人就会问了，sealos 屏蔽了 kubernetes 细节是不是就对 kubernetes 专业人士不友好了，其实一样的道理，专业人士只需要

安装一个 kuberentes dashboard 或者安装一个 cloud terminal 应用所有原生的体验都一点问题没有，kubectl 这样的命令也

可以直接用。他们用起来一样会很舒服，甚至 rancher 和 kubesphere 也可以是 sealos 上的一款云管应用。

> 未来 sealos 的用户群体

你发现一个有意思的点，全球 70 亿人，手机操作系统却只需要两款主流的，为什么，就是因为系统是抽象的，系统之上的应用是具体的，

生产关系一定要是 n 对 n 才能满足 70 亿人的需求，rancher kubesphere 的生产关系显然是 1 对 n.

sealos 系统上分布式应用是一等公民，未来有十万级应用满足企业方方面面对云和数字化的诉求。

当前 B 端企业都有定制化需求，因为云操作系统标准化与生产力没有达到安卓这样的级别，导致生产关系没被改变。

所以 sealos 上会跑各种应用，数据库/消息/AI 能力/甚至 SaaS软件

sealos 当前应用覆盖(20+ 款)：

- 函数计算 laf (自研)
- 数据库 mysql clickhouse redis
- 消息队列 kafka
- GPU 
- 监控 prometheus

[更多应用](https://hub.docker.com/u/labring)

sealos 本身要做的最核心的事情就是管理好这些应用，这些分布式应用本身也是 sealos 的一部分，不过都可以自由的安装卸载.

## sealos 的应用与 rancher kubesphere 应用市场应用的差异

* sealos 标准完全兼容 OCI, 能完全和 docker hub 兼容
* sealos 应用所有依赖基于集群镜像方式打包
* sealos desktop 注重应用本身"自管理"，而其它应用市场安装完会以 kubernetes 原生对象透出
* sealos 的产品体验，一切皆应用，而其它工具是 kubernetes 管理界面中嵌套应用市场使用上会有很多干扰
* 不懂 kubernetes 也能很方便的使用 sealos 分布式应用，而其它工具都是需要懂才能使用