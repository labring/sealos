<h2 align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./docs/4.0/img/sealos-left-dark.png" />
  <source media="(prefers-color-scheme: light)" srcset="./docs/4.0/img/sealos-left.png" />
  <img src="./docs/4.0/img/sealos-left.png" />
</picture>

一款以 Kubernetes 为内核的云操作系统发行版

</h2>

<div align="center">

[![Open in Dev Container](https://img.shields.io/static/v1?label=Dev%20Container&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/github/labring/sealos)
[![Build Status](https://github.com/labring/sealos/actions/workflows/release.yml/badge.svg)](https://github.com/labring/sealos/actions)
[![](https://img.shields.io/docker/pulls/labring/kubernetes)](https://hub.docker.com/r/labring/kubernetes)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_shield)
[![codecov](https://codecov.io/gh/labring/sealos/branch/main/graph/badge.svg?token=e41ZDcj06N)](https://codecov.io/gh/labring/sealos)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fpostwoman.io&logo=Postwoman)](https://sealos.run)
[![OSCS Status](https://www.oscs1024.com/platform/badge/labring/sealos.svg?size=small)](https://www.oscs1024.com/repo/labring/sealos?ref=badge_small)

<br />

[![discord](https://theme.zdassets.com/theme_assets/678183/cc59daa07820943e943c2fc283b9079d7003ff76.svg)](https://discord.gg/qzBmGGZGk7)

</div>

https://github.com/user-attachments/assets/a7b7ed5c-0e31-4158-8a76-3b161ed70a70

<p align="center">
  <a href="https://sealos.run/docs/Intro">文档</a> |
  <a href="./README.md">English</a> | 
  <a href="https://github.com/orgs/labring/projects/4/views/9">发展规划</a>
</p>

Sealos 是一款以 Kubernetes 为内核的**云操作系统发行版**。它以云原生的方式，抛弃了传统的云计算架构，转向以 Kubernetes 为云内核的新架构，使企业能够**像使用个人电脑一样**简单地使用云。


## 🚀 在 Sealos 上快速部署分布式应用

[在线使用](https://cloud.sealos.run)

* [在 Sealos 上 30 秒内轻松部署 Nginx](https://sealos.run/docs/quick-start/use-app-launchpad)
* [在 Sealos 上 30 秒启动 mysql/pgsql/mongo 高可用数据库](https://sealos.run/docs/quick-start/use-database)
* [在 Sealos 上 运行 WordPress](https://sealos.run/docs/examples/blog-platform/install-wordpress)
* [在 Sealos 上 运行 Uptime Kuma 拨测系统](https://sealos.run/docs/examples/dial-testing-system/install-uptime-kuma)
* [在 Sealos 上 运行低代码平台](https://sealos.run/docs/category/low-code-platform)
* [在 Sealos 上 运行搭建聊天应用](https://sealos.run/docs/examples/social-communication/install-tailchat)

![](/docs/4.0/img/sealos-desktop-zh.webp)

🔍 您可以通过以下的屏幕截图进一步了解 Sealos，关于 Sealos 更为详细的介绍与说明，请参阅 [什么是 Sealos](https://sealos.run/docs/Intro)。

<div align="center">

| 模板市场 | 应用管理 |
| :---: | :---: |
| ![](/docs/4.0/img/templates-zh.jpg) | ![](/docs/4.0/img/app-launchpad-1-zh.jpg) |
| 数据库管理 | 函数计算 |
| ![](/docs/4.0/img/database-zh.jpg) | ![](/docs/4.0/img/laf-zh.jpg) |

</div>

## 💡 核心功能

- 🚀 **应用管理**：在模板市场中轻松管理并快速发布可公网访问的分布式应用。
- 🗄️ **数据库管理**：秒级创建高可用数据库，支持 MySQL、PostgreSQL、MongoDB 和 Redis。
- 🌥️ **公私一致**：即是公有云也是私有云，支持传统应用无缝迁移到云环境。

## 🌟 优势

- 💰 **高效 & 经济**：仅需为容器付费，自动伸缩杜绝资源浪费，大幅度节省成本。
- 🌐 **通用性强，无心智负担**：专注于业务本身，无需担心复杂性，几乎没有学习成本。
- 🛡️ **灵活 & 安全**：多租户共享机制在确保安全的同时，实现资源隔离与高效协作。


## 🏘️ 社区与支持

- 🌐 访问 [Sealos官网](https://sealos.run/) 获取完整的文档和实用链接。

- 📱 扫码加入社区微信交流群👇

  <img style="width: 250px;" src="https://oss.laf.run/htr4n1-images/sealos-qr-code.jpg">

- 💬 加入我们的 [Discord服务器](https://discord.gg/qzBmGGZGk7)，与 Sealos 开发者和终端用户进行交流。这是了解 Sealos 和 Kubernetes 以及提问和分享经验的理想之地。

- 🐦 在 [Twitter](https://twitter.com/sealosio) 上关注我们。

- 🐞 请将任何 Sealos 的 Bug、问题和需求提交到 [GitHub Issue](https://github.com/labring/sealos/issues/new/choose)。

## 🚧 发展规划

Sealos 维护了一个[公开的发展路线图](https://github.com/orgs/labring/projects/4/views/9)，为项目的主要优先事项、不同功能和项目的成熟度，以及如何影响项目方向提供了高级视图。

## 👩‍💻 贡献与开发

翻阅[现有的 Issue](https://github.com/labring/sealos/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) 和 [Pull Requests](https://github.com/labring/sealos/pulls?q=is%3Apr+is%3Aopen+sort%3Aupdated-desc)，看看您是否能提供帮助。如果您想要新增需求或报告 Bug，请使用我们提供的模板[创建一个 GitHub Issue](https://github.com/labring/sealos/issues/new/choose)。

📖 [查看贡献指南 →](./CONTRIBUTING.md)

🔧 [查看开发指南 →](./DEVELOPGUIDE.md)

## 🔗 链接

- [Laf](https://github.com/labring/laf) 是 Sealos 上的一款函数计算应用，让写代码像写博客一样简单，随时随地发布上线。
- [Buildah](https://github.com/containers/buildah) 在 Sealos 4.0 中，我们广泛地利用了 Buildah 的能力，以确保集群镜像与 OCI 标准兼容。

<!-- ## License -->

<!-- [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_large) -->
