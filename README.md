<h2 align="center">
  
![](/docs/4.0/img/sealos-left-dark.png#gh-dark-mode-only)
![](/docs/4.0/img/sealos-left.png#gh-light-mode-only)

A general-purpose Cloud Operating System designed for managing Cloud Native applications

</h2>

<div align="center">

[![Open in Dev Container](https://img.shields.io/static/v1?label=Dev%20Container&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/labring/sealos)
[![Build Status](https://github.com/labring/sealos/actions/workflows/release.yml/badge.svg)](https://github.com/labring/sealos/actions)
[![](https://img.shields.io/docker/pulls/labring/kubernetes)](https://hub.docker.com/r/labring/kubernetes)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_shield)
[![codecov](https://codecov.io/gh/labring/sealos/branch/main/graph/badge.svg?token=e41ZDcj06N)](https://codecov.io/gh/labring/sealos)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fpostwoman.io&logo=Postwoman)](https://sealos.io)
[![OSCS Status](https://www.oscs1024.com/platform/badge/labring/sealos.svg?size=small)](https://www.oscs1024.com/project/labring/sealos?ref=badge_small)
<br /><br />
[![discord](https://theme.zdassets.com/theme_assets/678183/cc59daa07820943e943c2fc283b9079d7003ff76.svg)](https://discord.gg/7bPNZfsjJu)

</div>

> [Docs](https://www.sealos.io/docs/Intro) | [简体中文](https://www.sealos.io/zh-Hans/docs/Intro) ｜ [Roadmap](https://github.com/orgs/labring/projects/4/views/9)

**Sealos is a Kubernetes distribution, a general-purpose Cloud Operating System designed for managing Cloud Native applications.**

![](https://user-images.githubusercontent.com/8912557/173866494-379ba0dd-05af-4095-b63d-08f594581c52.png)

- Henceforth, envisage all your machinery as an ethereal supercomputer, whose operating system is Sealos, with Kubernetes assuming the role of the OS kernel.
- Rather than IaaS, PaaS, and SaaS, the new paradigm shall solely encompass Cloud OS drivers (CSI, CNI, and CRI implementations), Cloud OS kernel (Kubernetes), and distributed applications.

## Run a Kubernetes cluster

[![asciicast](https://asciinema.org/a/519263.svg)](https://asciinema.org/a/519263?speed=3)

## Demo

[Sealos Desktop](https://cloud.sealos.io)

[Sealos Desktop Docs](https://www.sealos.io/docs/cloud/Intro)

Utilize the Cloud infrastructure akin to a Desktop computer, with the liberty to install or uninstall any Distributed Application at will:

![](/docs/4.0/img/sealos-desktop.png)

Some Screen Shots of `Sealos Desktop`:

<div align="center">

| Sealos App Store | Sealos App Store |
| :---: | :---: |
| ![](/docs/4.0/img/sealos-app-store-1.jpg) | ![](/docs/4.0/img/sealos-app-store-2.jpg) |

| PostgreSQL on Sealos Desktop | PostgreSQL on Sealos Desktop |
| :---: | :---: |
| ![](/docs/4.0/img/postgresql-1.jpg) | ![](/docs/4.0/img/postgresql-2.jpg) |

</div>

## Core features

- ☸️ Manage clusters lifecycle
  - [x] Quickly install HA Kubernetes clusters.
  - [x] Add / remove nodes, Clean the cluster.
  - [ ] Backup and auto recovering, etc.
- 💻 Download and deploy OCI-compatible distributed applications.
  - [x] OpenEBS, MinIO, Ingress, PostgreSQL, MySQL, Redis, etc.
- 🛠️ Customize your own distributed applications.
  - [x] Utilizing Dockerfile to build images of distributed applications while preserving all of their dependencies.
  - [x] Push images of distributed applications to Docker Hub.
  - [x] Integrate various applications to construct a personalized Cloud platform.
- ☁️ Sealos Cloud
  - [x] Multi-tenant management.
  - [ ] Application management.
  - [x] Multi-cloud cluster management, deploy Kubernetes and custom applications on any cloud platform.
  - [x] Run any distributed applications.
  - [x] Cloud terminal.
  - [x] App Store.

## Quickstart

> Installing a highly available Kubernetes cluster with Calico as the container network interface (CNI).

Here, the Cluster images `kubernetes:v1.24.0` and `calico:v3.24.1` stored in the registry are fully compliant with the OCI standard. However, if you prefer to use flannel, it is also an option.

```bash
# Download and install Sealos, which is a binary tool written in Golang. Simply download it and copy it to the bin directory. You can also download it from the release page.
$ wget  https://github.com/labring/sealos/releases/download/v4.1.4/sealos_4.1.4_linux_amd64.tar.gz  && \
    tar -zxvf sealos_4.1.4_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin 
# Create a cluster
$ sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```

* Supported Kubernetes versions: [240+ Kubernetes versions](https://hub.docker.com/r/labring/kubernetes/tags) [Kubernetes with cri-docker runtime](https://hub.docker.com/r/labring/kubernetes-docker/tags)
* Other [images for distributed applications](https://hub.docker.com/u/labring)

> Single host

```bash
$ sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 --single
# remove taint
$ kubectl taint nodes --all node-role.kubernetes.io/master:NoSchedule-
```

> Building a custom Cluster image

Reference [Building an Example CloudImage](https://www.sealos.io/docs/getting-started/build-example-cloudimage).

> Storage, Message queue, Database, etc.

Don't be shocked by the following:

```bash
sealos run labring/helm:v3.8.2 # install helm
sealos run labring/openebs:v1.9.0 # install openebs
sealos run labring/minio-operator:v4.4.16 labring/ingress-nginx:4.1.0 \
   labring/mysql-operator:8.0.23-14.1 labring/redis-operator:3.1.4 # oneliner
```

And now everything is ready.

## Use Kubernetes Cluster image with cri-docker runtime

```bash
sealos run labring/kubernetes-docker:v1.20.8-4.1.4 labring/calico:v3.22.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```

## Community & support

+ Visit the [Sealos website](https://sealos.io/) for full documentation and useful links.
+ Join our [Discord server](https://discord.gg/7bPNZfsjJu) is to chat with Sealos developers and other Sealos users. This is a good place to learn about Sealos and Kubernetes, ask questions, and share your experiences.
+ Tweet at @sealosio on Twitter.
+ Create [GitHub Issues](https://github.com/labring/sealos/issues/new/choose) for bug reports and feature requests.

## Roadmap

Sealos maintains a [public roadmap](https://github.com/orgs/labring/projects/4/views/9). It gives a a high-level view of the main priorities for the project, the maturity of different features and projects, and how to influence the project direction.

## Contributing & Development

Have a look through [existing Issues](https://github.com/labring/sealos/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc) and [Pull Requests](https://github.com/labring/sealos/pulls?q=is%3Apr+is%3Aopen+sort%3Aupdated-desc) that you could help with. If you'd like to request a feature or report a bug, please [create a GitHub Issue](https://github.com/labring/sealos/issues/new/choose) using one of the templates provided.

[See contribution guide →](./CONTRIBUTING.md)

[See development guide →](./DEVELOPGUIDE.md)

## Links

- [Sealos Action](https://github.com/labring/sealos-action)
- [Bug Verify Example](https://github.com/labring-actions/bug-verify)
- [Application Image](https://github.com/labring-actions/cluster-image)
- [Rootfs Image](https://github.com/labring-actions/runtime)
- [Sealos 3.0(older version)](https://github.com/labring/sealos/tree/release-v3.3.9#readme) For older version users. Note that sealos 4.0 includes significant improvements, so please upgrade ASAP.
- [Buildah](https://github.com/containers/buildah) The functionalities of Buildah are extensively utilized in Sealos 4.0 to ensure that cluster images are compatible with OCI standard.

<!-- ## License -->

<!-- [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_large) -->