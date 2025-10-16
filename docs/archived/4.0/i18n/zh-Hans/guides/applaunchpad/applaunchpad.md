---
sidebar_position: 1
---

# 应用管理

**应用管理** 是 Sealos 内置的单镜像部署工具，主要用于简化和加速应用程序的部署过程，可以帮助您在 5 分钟内完成应用的部署和上线。

目前「应用管理」具备以下功能：

- 支持使用私有镜像部署应用；
- 支持根据应用需求，自定义所需的 CPU 和内存资源；
- 支持多副本；
- 弹性伸缩 (HPA)；
- 提供外网访问地址，便于公网访问；
- 允许用户为应用配置自定义域名，提高品牌识别度和用户体验；
- ConfigMap 配置文件；
- 应用数据的持久化存储，保障数据的安全性和持续性；
- 提供应用和 Pod 的实时监控，帮助用户及时发现并解决问题；
- 记录和管理应用日志，便于问题追踪和性能分析；
- 分析系统事件（Events），提供关键信息帮助优化应用性能；
- 一键进入容器终端，方便管理和调试；
- 支持将应用的多个端口暴露到外网。

## [快速开始](/quick-start/use-app-launchpad.md)

快速安装一些比较常见的应用。

## [更新应用](/guides/applaunchpad/update-app.md)

应用部署完成后修改应用配置。

## [自定义域名](/guides/applaunchpad/add-domain.md)

为应用接入自定义域名。

## [暴露多端口](/guides/applaunchpad/expose-multi-ports.md)

将应用的多个端口暴露到外网中。

## [环境变量](/guides/applaunchpad/environment.md)

通过环境变量为应用提供配置信息。

## [配置文件](/guides/applaunchpad/configmap.md)

通过配置文件为应用提供配置信息。

## [弹性伸缩](/guides/applaunchpad/autoscale.md)

通过弹性伸缩来根据负载自动调整应用的实例数量。

## [持久化存储](/guides/applaunchpad/persistent-volume.md)

使用持久化存储来保障数据的持久化。