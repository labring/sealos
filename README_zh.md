<h2 align="center">

![](/docs/4.0/img/sealos-left-dark.png#gh-dark-mode-only)
![](/docs/4.0/img/sealos-left.png#gh-light-mode-only)

一款以 Kubernetes 为内核的云操作系统发行版

</h2>

<div align="center">

[![Open in Dev Container](https://img.shields.io/static/v1?label=Dev%20Container&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/github/labring/sealos)
[![Build Status](https://github.com/labring/sealos/actions/workflows/release.yml/badge.svg)](https://github.com/labring/sealos/actions)
[![](https://img.shields.io/docker/pulls/labring/kubernetes)](https://hub.docker.com/r/labring/kubernetes)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_shield)
[![codecov](https://codecov.io/gh/labring/sealos/branch/main/graph/badge.svg?token=e41ZDcj06N)](https://codecov.io/gh/labring/sealos)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fpostwoman.io&logo=Postwoman)](https://sealos.io)
[![OSCS Status](https://www.oscs1024.com/platform/badge/labring/sealos.svg?size=small)](https://www.oscs1024.com/project/labring/sealos?ref=badge_small)

<br />

[![discord](https://theme.zdassets.com/theme_assets/678183/cc59daa07820943e943c2fc283b9079d7003ff76.svg)](https://discord.gg/eHyXHtSE)

</div>

![](/docs/4.0/img/sealos-desktop.webp)

> [文档](https://www.sealos.io/docs/Intro) | [English](README.md) | [发展规划](https://github.com/orgs/labring/projects/4/views/9)

Sealos 是一款以 Kubernetes 为内核的**云操作系统发行版**。它以云原生的方式，抛弃了传统的云计算架构，转向以 Kubernetes 为云内核的新架构，使企业能够**像使用个人电脑一样**简单地使用云。


## 🚀 在 Sealos 上快速部署分布式应用

[在线使用](https://cloud.sealos.io)

* [在 Sealos 上 30 秒内轻松部署 Nginx](https://sealos.io/docs/quick-start/install-apps-with-app-launchpad)
* [在 Sealos 上 30 秒启动 mysql/pgsql/mongo 高可用数据库](https://sealos.io/docs/quick-start/install-db-with-database)
* [在 Sealos 上 运行 WordPress](https://sealos.io/docs/examples/blog-platform/install-wordpress)
* [在 Sealos 上 运行 Uptime Kuma 拨测系统](https://sealos.io/docs/examples/dial-testing-system/install-uptime-kuma)
* [在 Sealos 上 运行低代码平台](https://sealos.io/docs/category/low-code-platform)

![](/docs/4.0/img/app-launchpad-zh.png)

🔍 您可以通过以下的屏幕截图进一步了解 Sealos，关于 Sealos 更为详细的介绍与说明，请参阅 [什么是 Sealos](https://sealos.io/docs/Intro)。

<div align="center">

| 终端 | 应用管理 |
| :---: | :---: |
| ![](/docs/4.0/img/terminal-zh.webp) | ![](/docs/4.0/img/app-launchpad-1-zh.webp) |
| 数据库管理 | 函数计算 |
| ![](/docs/4.0/img/database-zh.webp) | ![](/docs/4.0/img/laf-zh.webp) |

</div>

## 💡 核心功能

✅ **登录即可使用 Kubernetes**：无需安装 Kubernetes 集群，Sealos 提供**多租户**在公网环境共享一个 Kubernetes 的能力。除此之外还提供了强隔离能力，以保障各个租户的数据安全。

✅ **快速部署任意应用**：通过内置的应用管理，您可以在短时间内快速部署任意分布式应用。

✅ **节省资源，降低开销**：只需为容器付费，自动伸缩功能从根本上解决了资源浪费的问题，可以节省10%～40%的成本。

✅ **轻松实现公网访问**：为您的业务自动分配二级域名，帮助您轻松实现公网访问，同时还支持自定义域名绑定。

✅ **高效数据库服务**：提供秒级创建高可用数据库的服务，使业务通过服务发现内网 DNS 能直接数据库。

✅ **用户友好的操作体验**：内置终端直接支持命令行操作 Kubernetes 集群，同时支持部署 Kubernetes 管理界面，让您无论对云原生技术是否熟悉，都能在 Sealos 上拥有良好的使用体验。


## 🏘️ 社区与支持

- 🌐 访问 [Sealos官网](https://sealos.io/) 获取完整的文档和实用链接。

- 📱 扫码加入社区微信交流群👇

  ![](/docs/4.0/img/sealos-qr-code-300.png)

- 💬 加入我们的 [Discord服务器](https://discord.gg/eHyXHtSE)，与 Sealos 开发者和终端用户进行交流。这是了解 Sealos 和 Kubernetes 以及提问和分享经验的理想之地。

- 🐦 在 [Twitter](https://twitter.com/sealosio) 上关注我们。

- 🐞 请将任何 Sealos 的 Bug、问题和需求提交到 [GitHub Issue](https://github.com/labring/sealos/issues/new/choose)。

## 🚧 发展规划

Sealos 维护了一个[公开的发展路线图](https://github.com/orgs/labring/projects/4/views/9)，为项目的主要优先事项、不同功能和项目的成熟度，以及如何影响项目方向提供了高级视图。

## 👩‍💻 贡献与开发

翻阅[现有的 Issue](https://github.com/labring/sealos/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) 和 [Pull Requests](https://github.com/labring/sealos/pulls?q=is%3Apr+is%3Aopen+sort%3Aupdated-desc)，看看您是否能提供帮助。如果您想要新增需求或报告 Bug，请使用我们提供的模板[创建一个 GitHub Issue](https://github.com/labring/sealos/issues/new/choose)。

📖 [查看贡献指南 →](https://chat.openai.com/c/CONTRIBUTING.md)

🔧 [查看开发指南 →](https://chat.openai.com/c/DEVELOPGUIDE.md)

## 🔗 链接

- [Sealos Action](https://github.com/labring/sealos-action)
- [集群镜像](https://github.com/labring-actions/cluster-image)
- [Rootfs镜像](https://github.com/labring-actions/runtime)
- [Buildah](https://github.com/containers/buildah) 在 Sealos 4.0 中，我们广泛地利用了 Buildah 的能力，以确保集群镜像与 OCI 标准兼容。

<!-- ## License -->

<!-- [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_large) -->
