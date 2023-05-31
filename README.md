<h2 align="center">

![](/docs/4.0/img/sealos-left-dark.png#gh-dark-mode-only)
![](/docs/4.0/img/sealos-left.png#gh-light-mode-only)

A Cloud Operating System designed for managing Cloud Native applications

</h2>

<div align="center">

[![Open in Dev Container](https://img.shields.io/static/v1?label=Dev%20Container&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/labring/sealos)
[![Build Status](https://github.com/labring/sealos/actions/workflows/release.yml/badge.svg)](https://github.com/labring/sealos/actions)
[![](https://img.shields.io/docker/pulls/labring/kubernetes)](https://hub.docker.com/r/labring/kubernetes)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_shield)
[![codecov](https://codecov.io/gh/labring/sealos/branch/main/graph/badge.svg?token=e41ZDcj06N)](https://codecov.io/gh/labring/sealos)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fpostwoman.io&logo=Postwoman)](https://sealos.io)
[![OSCS Status](https://www.oscs1024.com/platform/badge/labring/sealos.svg?size=small)](https://www.oscs1024.com/project/labring/sealos?ref=badge_small)

<br />

[![discord](https://theme.zdassets.com/theme_assets/678183/cc59daa07820943e943c2fc283b9079d7003ff76.svg)](https://discord.gg/7bPNZfsjJu)

</div>

![](https://user-images.githubusercontent.com/8912557/236477759-3532fdec-c355-4f8d-92ef-9f6fce3c50da.png)

> [Docs](https://www.sealos.io/docs/Intro) | [简体中文](https://www.sealos.io/zh-Hans/docs/Intro) ｜ [Roadmap](https://github.com/orgs/labring/projects/4/views/9)


## Run your app on Sealos

[Try online demo](https://cloud.sealos.io)

Run nginx on Sealos in 30 seconds.

![](https://user-images.githubusercontent.com/8912557/236479998-c4949070-a4bc-4900-bfe8-d8b3b4728e60.png)

Some Screen Shots of `Sealos Desktop`:

<div align="center">

| Sealos Terminal | Sealos App Launchpad |
| :---: | :---: |
| ![](https://user-images.githubusercontent.com/8912557/236481248-1bd521ae-b483-440a-8177-ae90081f8973.png) | ![](https://user-images.githubusercontent.com/8912557/236480220-5a3f09c1-8e75-4727-a398-244d86f32133.png) |

</div>

## Core features

- Run any application on Sealos.
  - Run nginx on sealos in 30s.
  - Run you own project on sealos, like some java/go/python/node.js webserver.
  - Run you website static files on sealos.
  - Run database and some stateful applications on sealos.
- 💻 Download and deploy OCI-compatible distributed applications.
  - [x] OpenEBS, MinIO, Ingress, PostgreSQL, MySQL, Redis, etc.
- 🛠️ Customize your own distributed applications.
  - [x] Automatically rewrite image name in the Kubernetes manifest.
  - [x] Utilizing Dockerfile to build images of distributed applications while preserving all of their dependencies.
  - [x] Push images of distributed applications to Docker Hub.
  - [x] Integrate various applications to construct a personalized Cloud platform.
  

## Community & support

+ Visit the [Sealos website](https://docs.sealos.io/) for full documentation and useful links.
+ Join our [Discord server](https://discord.gg/7bPNZfsjJu) is to chat with Sealos developers and other Sealos users. This is a good place to learn about Sealos and Kubernetes, ask questions, and share your experiences.
+ Tweet at @sealosio on [Twitter](https://twitter.com/sealosio) and follow us.
+ Create [GitHub Issues](https://github.com/labring/sealos/issues/new/choose) for bug reports and feature requests.

## Roadmap

Sealos maintains a [public roadmap](https://github.com/orgs/labring/projects/4/views/9). It gives a a high-level view of the main priorities for the project, the maturity of different features and projects, and how to influence the project direction.

## Contributing & Development

Have a look through [existing Issues](https://github.com/labring/sealos/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) and [Pull Requests](https://github.com/labring/sealos/pulls?q=is%3Apr+is%3Aopen+sort%3Aupdated-desc) that you could help with. If you'd like to request a feature or report a bug, please [create a GitHub Issue](https://github.com/labring/sealos/issues/new/choose) using one of the templates provided.

[See contribution guide →](./CONTRIBUTING.md)

[See development guide →](./DEVELOPGUIDE.md)

## Links

- [Sealos Action](https://github.com/labring/sealos-action)
- [Sealos Rebot](https://github.com/labring/gh-rebot)
- [Application Image](https://github.com/labring-actions/cluster-image)
- [Rootfs Image](https://github.com/labring-actions/runtime)
- [Buildah](https://github.com/containers/buildah) The functionalities of Buildah are extensively utilized in Sealos 4.0 to ensure that cluster images are compatible with OCI standard.

<!-- ## License -->

<!-- [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_large) -->
