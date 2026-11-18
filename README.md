<div align="center">

  <a href="https://sealos.io" target="_blank" rel="noopener">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="./docs/img/sealos-left-dark.png" />
      <source media="(prefers-color-scheme: light)" srcset="./docs/img/sealos-left.png" />
      <img src="./docs/img/sealos-left.png" />
    </picture>
  </a>
  
# Sealos — Your Ops Agent for full-stack apps

Deploy from your desktop and keep your apps running with an AI Ops Agent. Sealos brings app hosting, databases, object storage and AI model access into one workspace, powered by Kubernetes.

<a href="https://github.com/sealox/sealox-releases/releases/latest"><img src="https://img.shields.io/badge/Download-Sealos_Desktop-2563EB?style=for-the-badge&amp;logo=github&amp;logoColor=white" alt="Download Sealos Desktop" /></a>

[Website](https://sealos.io/) · [Documentation](https://sealos.io/docs) · [简体中文](./README_zh.md)

</div>

<div align="center">

[![Open in Dev Container](https://img.shields.io/static/v1?label=Dev%20Container&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/github/labring/sealos)
[![Build Status](https://github.com/labring/sealos/actions/workflows/release.yml/badge.svg)](https://github.com/labring/sealos/actions)
[![](https://img.shields.io/docker/pulls/labring/kubernetes)](https://hub.docker.com/r/labring/kubernetes)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_shield)
[![codecov](https://codecov.io/gh/labring/sealos/branch/main/graph/badge.svg?token=e41ZDcj06N)](https://codecov.io/gh/labring/sealos)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fpostwoman.io&logo=Postwoman)](https://sealos.io)
[![OSCS Status](https://www.oscs1024.com/platform/badge/labring/sealos.svg?size=small)](https://www.oscs1024.com/repo/labring/sealos?ref=badge_small)

<a href="https://runacap.com/ross-index/annual-2023/" target="_blank" rel="noopener">
    <img
        style="width: 260px; height: 56px margin-top: 50px"
        src="https://runacap.com/wp-content/uploads/2024/03/Annual_ROSS_badge_black_2023.svg"
        alt="ROSS Index - Fastest Growing Open-Source Startups | Runa Capital"
        width="260"
        height="56"
    />
</a>

</div>

<hr />

<div align="center">
 <a href="https://sealos.io">Website</a> •
  <a href="https://sealos.io/docs">Docs</a> •
  <a href="https://discord.gg/wdUn538zVP">Discord</a> •
  <a href="https://twitter.com/Sealos_io">Twitter</a> •
  <a href="./README_zh.md">简体中文</a>
</div>

## Start with Sealos Desktop

1. [Download Sealos Desktop](https://github.com/sealox/sealox-releases/releases/latest) and choose the installer for your system.
2. Sign in, open a local folder, paste a GitHub repository URL, or choose an application template.
3. Describe your deployment and database needs, review the agent's plan, and approve it.
4. Open your live app, then manage its services and ask the agent for help from the same project.

> The desktop app is your control center. Deployed services run in your chosen Sealos Cloud region.

## What you can do from your desktop

| Capability | How it helps |
| --- | --- |
| Local project deployment | Publish a codebase or a single HTML page to a public HTTPS URL. |
| GitHub deployment | Choose a repository and branch; Sealos handles the build and port detection. |
| Application templates | Launch tools such as Dify, n8n, WordPress and Open WebUI. |
| Project operations | Inspect service status, logs and metrics, open container terminals, and roll back deployments. |
| AI troubleshooting | Investigate failures with logs and metrics, then review proposed fixes before they run. |
| Live page updates | Select a page element, describe a change, and publish a new revision with rollback available. |

## Your stack in one workspace

- **Databases:** PostgreSQL, MySQL, MongoDB and Redis, with connection strings wired into your apps and daily backups.
- **Object storage:** S3-compatible buckets for uploads and assets.
- **AI Gateway:** Access multiple model providers through one endpoint and key.
- **Team workspaces:** Share projects while each member uses their own credentials.

Sealos runs on Kubernetes, with standard container images and database engines underneath. See the [documentation](https://sealos.io/docs) for platform and infrastructure details.

## 🏘️ Community & support

- 🌐 Visit the [Sealos Website](https://sealos.io/) for full documentation and useful links.
- 💬 Join our [Discord Server](https://discord.gg/wdUn538zVP) to chat with the Sealos team and other Sealos users. This is a good place to learn about Sealos and Kubernetes, ask questions, and share your experiences.
- 🐦 Tweet at @Sealos_io on [X/Twitter](https://twitter.com/Sealos_io) and follow us.
- 🐞 Create [GitHub Issues](https://github.com/labring/sealos/issues/new/choose) for bug reports and feature requests.

## 🚧 Roadmap

Sealos maintains a [public roadmap](https://github.com/orgs/labring/projects/4/views/9). It gives a high-level view of the main priorities for the project, the maturity of different features and projects, and how to influence the project direction.

## 👩‍💻 Contributing & Development

Have a look through [existing issues](https://github.com/labring/sealos/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) and [Pull Requests](https://github.com/labring/sealos/pulls?q=is%3Apr+is%3Aopen+sort%3Aupdated-desc) that you could help with. If you'd like to request a feature or report a bug, please [create a GitHub Issue](https://github.com/labring/sealos/issues/new/choose) using one of the templates provided.

📖 [See contribution guide →](./CONTRIBUTING.md)

🔧 [See development guide →](./DEVELOPGUIDE.md)

## Links

- [FastGPT](https://github.com/labring/FastGPT) is a free, open-source, and powerful AI knowledge base platform, offers out-of-the-box data processing, model invocation, RAG retrieval, and visual AI workflows. Easily build complex LLM applications.
- [Buildah](https://github.com/containers/buildah) The functionalities of Buildah are extensively utilized in Sealos 4.0 to ensure that cluster images are compatible with OCI standard.

[deploy-badge]: https://sealos.io/Deploy-on-Sealos.svg
[deploy-link]: https://os.sealos.io

## 📄 License

Sealos is licensed under the [Sealos Sustainable Use License](./LICENSE.md), a custom license that allows:

- ✅ Internal business use and personal non-commercial use
- ❌ Providing cloud services to third parties

**Not a standard open source license** - please review the [full license terms](./LICENSE.md) before use.

**Contributing**: By contributing, you agree to our [Contributor License Agreement](./CONTRIBUTOR_LICENSE_AGREEMENT.md) and license change terms.

<!-- ## License -->

<!-- [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_large) -->
