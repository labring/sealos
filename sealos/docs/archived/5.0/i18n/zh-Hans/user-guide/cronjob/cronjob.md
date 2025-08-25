---
keywords: [定时任务, Sealos, Cron表达式, 扩缩容, Kubernetes, 自动化运维, 部署管理, 任务调度, 容器编排, 云原生]
description: 了解如何在Sealos平台上创建和管理定时任务，实现自动化扩缩容和定期任务执行，提高Kubernetes集群的运维效率和资源利用率。
---

# 定时任务

定时任务用于按指定的时间表定期执行任务。

## 快速开始

打开 Sealos 桌面，点击定时任务。

![](./images/cronjob-1.png)

点击添加定时任务。

![](./images/cronjob-2.png)

这里启动了一个定时任务，每天下午 12 点时会将 nginx deployment 的实例数设置为 0。

输入自定义的任务名称，通过 Cron 表达式设置时间，类型选择扩缩容 Launchpad，App 名称选择 nginx（正在运行的 nginx
deployment），副本数 0，点击部署。

![](./images/cronjob-3.png)

成功添加定时任务后，可以点击详情查看定时任务的执行情况。

![](./images/cronjob-4.png)

详情中展示了成功数和失败数，以及历史任务的执行情况。

![](./images/cronjob-5.png) 