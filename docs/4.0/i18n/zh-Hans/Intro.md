# sealos Cloud 介绍

sealos Cloud 是环界云运行和维护的 sealos 集群，用来提供对外的公有云服务。
用户可以直接使用 [sealos Cloud](https://cloud.sealos.io)
用户也可以在自己的私有化环境中运行 sealos，即可拥有与 sealos Cloud 完全一样的能力。

sealos Cloud 是一款 ALL IN 云原生的公有云服务，提供我们在公有云常见的服务能力如 AWS 的数据库服务，函数计算服务，对象存储服务等。
与 AWS 这些公有云最大的不同点是技术架构完全采用云原生（狭义上的云原生，围绕 kubernetes 的技术生态所构建）架构实现。

## 为什么选 sealos Cloud

* 产品体验简单干净，如果你已经被其他厂商眼花缭乱的广告打折信息折磨
* 完全开源，意味着不受限，可以自由定制
* 公有云与私有云体验完全一致，sealos 的公有云与私有云是同一套代码，这种抽象维度是其他厂商很难做到的
* 到处运行，兼容各种其他云厂商基础设施，兼容裸金属，支持各种体系架构和主流 linux 操作系统
* 价格便宜，私有化可以帮助企业节省 80% 基础设施成本，直接使用公有云可以节省 10%～40% 成本
* 一切皆应用，用户只需要关心自己需要用的应用，其它应用可以一律不安装，让体验更简洁
* 架构精简，无论是在 电视盒子上还是数百台数千台服务器的数据中心都可以运行 sealos Cloud

## sealos Cloud 能力

* 登录即可使用 kubernetes，无需安装 kubernetes 集群，提供多租户在公网环境共享一个 kubernetes 的能力
  * 这种场景适合在 kubernetes 上部署业务组件的用户，而不适用于需要集群管理员权限的用户
  * 好处是无需安装直接使用，资源调度更充分所以成本也会更低，比同等规格虚拟机便宜 40% 以上，且提供强隔离能力
  * 劣势是用户无管理员权限
  * 非常合适企业很多部门共享一个集群的场景，让资源利用率大幅提升
* [App store](https://www.sealos.io/docs/cloud/apps/appstore/): 兼容 sealos 集群镜像的应用仓库，所有分布式软件可一键安装
* [Cloud Terminal](https://www.sealos.io/docs/cloud/apps/terminal/): 打开终端就可以直接使用 kubernetes, 部署自己的 pod
* [Sealos cloud provider](https://www.sealos.io/docs/cloud/apps/scp/): 帮助用户构建一个完全属于自己的 kubernetes 集群，且可以自由定义集群
* [Sealos pgsql](https://www.sealos.io/docs/cloud/apps/postgres/): 帮助用户分钟级构建 pgsql 数据库实例

未来 sealos 会提供更多应用

## 其它链接

* 欢迎加入我们的主社区 [discord](https://discord.gg/mzRVdnbw5g)
* 开源项目地址，欢迎关注我们 [github](https://github.com/labring/sealos)
* sealos 上的函数计算应用 [laf](https://github.com/labring/laf) 让写代码像写博客一样简单
* sealos Cloud 体验地址 [sealos Cloud](https://cloud.sealos.io)
* 商业化需求欢迎 [联系我们](https://www.wenjuan.com/s/UZBZJv9ToJ)