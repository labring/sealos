# 介绍

随着容器技术的发展，绝大多数企业开始意识到基于云原生架构的业务具有更强的鲁棒性，更低的成本，更高的效率。
现在企业在拥抱云原生时要么直接使用公有云提供的相关的云产品，如 kubernetes 服务，函数计算等。
要么通过各种开源方式来组装和二次开发一朵云来满足企业用云要求。

Sealos 给企业提供了一种选择，让企业和开发者不论是公有云还是私有云都只需要安装一个云操作系统即可。 
最终可以很方便的在操作系统上安全稳定的运行各种应用并解决应用需要的各种依赖，如高可用的数据库 对象存储 消息队列等。

Sealos 的理念中，云也可以像 linux 那样简单，一装就能用，用起来就没什么问题。只不过区别是 linux 装在一台服务器上，而 Sealos 是装在整个数据中心而已。
Sealos 同样认为公有云与私有云没有本质区别，应该是同一套代码的不同实例而已，只是配置不同或者上面安装的应用不同，装在内网就是私有，装在公网对外服务就是公有云。
Sealos 基于云内核架构设计，完全抛弃 IaaS PaaS SaaS 架构，并且认为 IaaS PaaS SaaS 架构是历史包袱，未来会走向消亡

## Sealos 是什么

Sealos 是以 kubernetes 为内核的云操作系统发行版, 单机操作系统如同 linux 发行版本可以在上面安装和使用各种单机应用，如 PPT，Word，Excel 等。
云操作系统只需要把这些单机应用替换成各种云应用，如数据库，对象存储，消息队列等，就很容易理解了，这些应用都是分布式高可用的。
Sealos 就是能支撑运行各种分布式应用的云操作系统。有了 Sealos 就拥有了一朵云。

## 适用场景 & 优势

Sealos cloud 可以非常好的支撑业务运行，如各种 java, go, pthon, php 等应用，不限编程语言。为应用提供运行环境，解决应用各种后端依赖，如数据库，对象存储，消息队列等。
解决应用配置管理，服务发现，公网暴露，自动伸缩等等问题。

- 公有云，如果你的业务需要运行在公有云上，可以直接使用 sealos 提供的公有云服务 [sealos cloud](cloud.sealos.io)
  - 打开网站直接使用，没有 kubernetes 的创建过程，sealos cloud 提供多租户共享一个 kubernetes 的模型。
  - 只需要为容器付费，天生支持自动伸缩, 从最根本上解决资源浪费问题。
  - 自动为业务分配二级域名，轻松实现业务公网访问。可自定义绑定自己的域名。
  - 提供数据库服务，秒级创建高可用数据库，业务通过服务发现内网 DNS 直接链接数据库。
  - 自带终端可直接敲 k8s 命令，支持 k8s 管理控制台，懂不懂云原生都能在 sealos 上有良好的体验。
- 私有云
  - 以上 sealos cloud 的能力可以部署在私有云上。
- 应用交付
  - Sealos 具备极强的 kubernetes 生命周期管理能力，且可以自由定义 kubernetes。
  - 通过集群镜像的能力把整个集群打包一键交付到客户环境中。各种服务与业务都可以整体打包交付。
  - Docker 只考虑单机镜像，而 sealos 打包整个集群，或者某个分布式应用。

Sealos 上有一些核心应用，来解决特定问题：
* [Cloud Terminal](https://www.sealos.io/docs/cloud/apps/terminal/): 打开终端就可以直接使用 kubernetes, 部署自己的 pod 等，完全兼容 k8s
* [Sealos cloud provider](https://www.sealos.io/docs/cloud/apps/scp/): 帮助用户构建一个完全属于自己的 kubernetes 集群，且可以自由定义集群
* [Sealos pgsql](https://www.sealos.io/docs/cloud/apps/postgres/): 帮助用户分钟级构建 pgsql 数据库实例
* [App store](https://www.sealos.io/docs/cloud/apps/appstore/): 兼容 sealos 集群镜像的应用仓库，所有分布式软件可一键安装

## 使用样例

* [使用 sealos terminal 部署一个 hello world 应用](https://sealos.io/zh-Hans/docs/cloud/apps/terminal/use-sealos-cloud-hello-world)
* [在 sealos 上使用 pgsql 数据库](https://sealos.io/zh-Hans/docs/cloud/apps/postgres/)
* [在 sealos 上运行一个 bytebase 数据库](https://sealos.io/zh-Hans/docs/cloud/examples/how-to-depoy-bytebase-on-sealos-cloud)
* [在 sealos 上启动一个独立的 kubernetes 集群](https://sealos.io/zh-Hans/docs/cloud/apps/scp/)
* [使用 sealos 管理集群生命周期，如安装，增删节点，升级等](https://sealos.io/zh-Hans/docs/getting-started/kuberentes-life-cycle)
* [在 sealos 上使用函数计算应用 laf](https://laf.dev)
* [在 sealos 桌面上添加一个快捷方式](https://sealos.io/zh-Hans/docs/cloud/examples/how-to-deploy-the-application-to-desktop)

## 其它链接

- [贡献指南](https://github.com/labring/sealos/blob/main/CONTRIBUTING.md)
- [开发指南](https://github.com/labring/sealos/blob/main/DEVELOPGUIDE.md)

加入组织 
* QQ 群（98488045）
* [discord](https://discord.gg/7bPNZfsjJu)