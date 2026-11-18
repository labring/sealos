<div align="center">

<a href="https://sealos.io">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./docs/img/sealos-left-dark.png" />
  <source media="(prefers-color-scheme: light)" srcset="./docs/img/sealos-left.png" />
  <img src="./docs/img/sealos-left.png" alt="Sealos" />
</picture>
</a>

# Sealos — 部署和持续运维全栈应用的 Ops Agent

从桌面部署项目，让 AI Ops Agent 协助日常运维。Sealos 将应用托管、数据库、对象存储和 AI 模型接入集中到一个工作空间，底层由 Kubernetes 驱动。

<a href="https://github.com/sealox/sealox-releases/releases/latest"><img src="https://img.shields.io/badge/Download-Sealos_Desktop-2563EB?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="下载 Sealos 桌面版" /></a>

[官网](https://sealos.io/) · [文档](https://sealos.io/docs) · [English](./README.md)

</div>

## 从 Sealos 桌面版开始

1. [下载 Sealos 桌面版](https://github.com/sealox/sealox-releases/releases/latest)，选择适合你系统的安装包。
2. 登录后打开本地文件夹、粘贴 GitHub 仓库链接，或选择应用模板。
3. 描述部署需求和所需数据库，查看 Agent 的执行计划并批准。
4. 打开上线后的应用，在同一项目中管理服务，并向 Agent 提问。

> 桌面版是项目的控制中心；部署后的服务运行在你选择的 Sealos Cloud 区域。

## 桌面版可以做什么

| 能力 | 使用方式 |
| --- | --- |
| 部署本地项目 | 将完整代码库或单个 HTML 页面发布为可公开访问的 HTTPS 链接。 |
| 部署 GitHub 仓库 | 选择仓库和分支，由 Sealos 完成构建和端口识别。 |
| 模板部署 | 快速启动 Dify、n8n、WordPress、Open WebUI 等应用。 |
| 统一运维视图 | 查看服务状态、日志和指标，打开容器终端，或回滚部署。 |
| AI 故障诊断 | 结合日志和指标排查故障；修复方案经你批准后执行。 |
| 页面热更新 | 选中线上页面元素并描述修改，发布新版本，并可回滚。 |

## 一个工作空间管理完整应用栈

- **数据库**：支持 PostgreSQL、MySQL、MongoDB 和 Redis，自动注入应用连接信息，并提供每日备份。
- **对象存储**：使用兼容 S3 的存储桶管理上传文件和应用资源。
- **AI Gateway**：通过统一的端点和密钥接入多个模型提供商。
- **团队协作**：共享工作空间和项目，每位成员使用自己的凭据。

Sealos 底层采用 Kubernetes，应用使用标准容器镜像，数据库采用标准引擎。平台与基础设施的更多信息见[文档](https://sealos.io/docs)。

## 🏘️ 社区与支持

- 🌐 访问 [Sealos官网](https://sealos.io/) 获取完整的文档和实用链接。

- 📱 扫码加入社区微信交流群👇

  <img style="width: 250px;" src="https://oss.laf.run/htr4n1-images/sealos-qr-code.jpg">

- 💬 加入我们的 [Discord服务器](https://discord.gg/qzBmGGZGk7)，与 Sealos 开发者和终端用户进行交流。这是了解 Sealos 和 Kubernetes 以及提问和分享经验的理想之地。

- 🐦 在 [Twitter](https://twitter.com/Sealos_io) 上关注我们。

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

## 📄 许可证

Sealos 采用 [Sealos 可持续使用许可证](./LICENSE.md)，这是一个定制许可证，允许：
- ✅ 内部商业用途和个人非商业用途
- ❌ 向第三方提供云服务

**这不是标准的开源许可证** - 使用前请查看 [完整许可证条款](./LICENSE.md)。

**贡献代码**: 通过贡献代码，您同意我们的 [贡献者许可协议](./CONTRIBUTOR_LICENSE_AGREEMENT.md) 和许可证变更条款。

<!-- ## License -->

<!-- [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_large) -->
