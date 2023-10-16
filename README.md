<h2 align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./docs/4.0/img/sealos-left-dark.png" />
  <source media="(prefers-color-scheme: light)" srcset="./docs/4.0/img/sealos-left.png" />
  <img src="./docs/4.0/img/sealos-left.png" />
</picture>

A Cloud Operating System designed for managing cloud-native applications

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

[![discord](https://theme.zdassets.com/theme_assets/678183/cc59daa07820943e943c2fc283b9079d7003ff76.svg)](https://discord.gg/qzBmGGZGk7)

</div>

https://github.com/labring/sealos/assets/82700206/b1f8a25a-55cf-4d15-a47b-38cf7d507134

> [Docs](https://sealos.io/docs/Intro) | [简体中文](./README_zh.md) | [Roadmap](https://github.com/orgs/labring/projects/4/views/9)

Sealos['siːləs] is a cloud operating system distribution based on the Kubernetes kernel. This allows enterprises to use the cloud as effortlessly as they would use a personal computer.

## 🚀 Deploy your app on Sealos

[Try online demo](https://cloud.sealos.io)

* [Easily Deploy Nginx in 30 Seconds on Sealos](https://sealos.io/docs/quick-start/app-deployments/use-app-launchpad)
* [Start a mysql/pgsql/mongo highly available database in 30 seconds on Sealos](https://sealos.io/docs/quick-start/app-deployments/install-db-with-database)
* [Running WordPress on Sealos](https://sealos.io/docs/examples/blog-platform/install-wordpress)
* [Running the Uptime Kuma dial test system on Sealos](https://docs.sealos.io/docs/examples/dial-testing-system/install-uptime-kuma)
* [Running a low-code platform on Sealos](https://docs.sealos.io/docs/category/low-code-platform)

![](/docs/4.0/img/app-launchpad.png)

🔍 Some Screen Shots of Sealos:

<div align="center">

| Terminal | App Launchpad |
| :---: | :---: |
| ![](/docs/4.0/img/terminal.webp) | ![](/docs/4.0/img/app-launchpad-1.webp) |
| Database | Serverless |
| ![](/docs/4.0/img/database.webp) | ![](/docs/4.0/img/laf.webp) |

</div>

## 💡 Core features

✅ **Instant Kubernetes Usage Upon Login**: There is no need to install a Kubernetes cluster. Sealos provides the ability for **multiple tenants** to share a Kubernetes on the public internet. It also offers strong  isolation capabilities to ensure the data safety of each tenant.

✅ **Swiftly deploy any application on Sealos**: With the in-built App Launchpad, effortlessly deploy any application in an astonishingly short span of time.

✅ **Resource Saving and Cost Reduction**: You only pay for the container. The automatic scaling function fundamentally solves the problem of resource wastage, saving between 10% to 40% in costs.

✅ **Easy Public Network Access**: Sealos automatically assigns a secondary domain name to your business,  helping you achieve easy public network access. It also supports custom  domain name binding.

✅ **Efficient Database Service**: Sealos offers a service that allows businesses to create  high-availability databases within seconds. Through service discovery,  the internal network DNS can connect directly to the database.

✅ **User-Friendly Operating Experience**: Sealos has an in-built terminal that supports command-line operation of the Kubernetes cluster, and also has in-built App Launchpad, allowing you to have a good user experience on Sealos, regardless of your familiarity with cloud-native  technology.


## 🏘️ Community & support

+ 🌐 Visit the [Sealos website](https://sealos.io/) for full documentation and useful links.
+ 💬 Join our [Discord server](https://discord.gg/qzBmGGZGk7) is to chat with Sealos developers and other Sealos users. This is a good place to learn about Sealos and Kubernetes, ask questions, and share your experiences.
+ 🐦 Tweet at @sealosio on [Twitter](https://twitter.com/sealosio) and follow us.
+ 🐞 Create [GitHub Issues](https://github.com/labring/sealos/issues/new/choose) for bug reports and feature requests.

## 🚧 Roadmap

Sealos maintains a [public roadmap](https://github.com/orgs/labring/projects/4/views/9). It gives a a high-level view of the main priorities for the project, the maturity of different features and projects, and how to influence the project direction.

## 👩‍💻 Contributing & Development

Have a look through [existing Issues](https://github.com/labring/sealos/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) and [Pull Requests](https://github.com/labring/sealos/pulls?q=is%3Apr+is%3Aopen+sort%3Aupdated-desc) that you could help with. If you'd like to request a feature or report a bug, please [create a GitHub Issue](https://github.com/labring/sealos/issues/new/choose) using one of the templates provided.

📖 [See contribution guide →](./CONTRIBUTING.md)

🔧 [See development guide →](./DEVELOPGUIDE.md)

## Links

- [Laf](https://github.com/labring/laf) is a function as a service application on sealos.
- [Buildah](https://github.com/containers/buildah) The functionalities of Buildah are extensively utilized in Sealos 4.0 to ensure that cluster images are compatible with OCI standard.

<!-- ## License -->

<!-- [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_large) -->
