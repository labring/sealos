<a href="https://trackgit.com">
   <img src="https://us-central1-trackgit-analytics.cloudfunctions.net/token/ping/kof6vgldhbx8pzyxyfck" alt="trackgit-views" />
</a>

<div align="center">
  <p>

[![Awesome](https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg)](https://github.com/labring/sealos)
[![Open in Dev Container](https://img.shields.io/static/v1?label=Dev%20Container&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/labring/sealos)
[![Build Status](https://github.com/labring/sealos/actions/workflows/release.yml/badge.svg)](https://github.com/labring/sealos/actions)
[![](https://img.shields.io/docker/pulls/labring/kubernetes)](https://hub.docker.com/r/labring/kubernetes)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_shield)
[![codecov](https://codecov.io/gh/labring/sealos/branch/main/graph/badge.svg?token=e41ZDcj06N)](https://codecov.io/gh/labring/sealos)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fpostwoman.io&logo=Postwoman)](https://sealyun.com)
[![OSCS Status](https://www.oscs1024.com/platform/badge/labring/sealos.svg?size=small)](https://www.oscs1024.com/project/labring/sealos?ref=badge_small)
[![Chat on Telegram](https://img.shields.io/badge/chat-Telegram-blueviolet?logo=Telegram)](https://t.me/cloudnativer)

  </p>
</div>

[![discord](https://theme.zdassets.com/theme_assets/678183/cc59daa07820943e943c2fc283b9079d7003ff76.svg)](https://discord.gg/7bPNZfsjJu)

---

[Docs](https://www.sealos.io/docs/Intro) | [简体中文](https://www.sealos.io/zh-Hans/docs/Intro) ｜ [roadmap](https://github.com/orgs/labring/projects/4/views/9)

## Run a Kubernetes cluster

[![asciicast](https://asciinema.org/a/519263.svg)](https://asciinema.org/a/519263?speed=3)

## What is sealos

**sealos is a Kubernetes distribution, a general-purpose cloud operating system for managing cloud-native applications.**

![](https://user-images.githubusercontent.com/8912557/173866494-379ba0dd-05af-4095-b63d-08f594581c52.png)

- From now on, think of all your machines as an abstract supercomputer whose operating system is sealos, where Kubernetes serves as the OS kernel.
- Instead of IaaS, PaaS and SaaS, there will only be cloud OS drivers(CSI, CNI and CRI implementations), cloud OS kernel(Kubernetes) and distributed applications.

## Demo show

[Online demo](https://cloud.sealos.io)

[sealos cloud DOCS](https://www.sealos.io/docs/cloud/Intro)

Use the cloud like a PC desktop, Freely run and uninstall any distributed applications:

![](https://user-images.githubusercontent.com/8912557/205539823-718da269-584c-46f1-b92e-7dc0227655ef.png)

Some Screen Shots of `sealos`:

<table>
  <tr>
      <td width="50%" align="center"><b>sealos cloud native app store</b></td>
      <td width="50%" align="center"><b>sealos cloud native app store</b></td>
  </tr>
  <tr>
     <td><img src="https://user-images.githubusercontent.com/8912557/206159907-8e34fb77-67dd-46fb-98e0-0181ee15f384.png"/></td>
     <td><img src="https://user-images.githubusercontent.com/8912557/206159396-d2af0767-ef09-4040-b80d-24f2fbf1d6e5.png"/></td>
  </tr>
  <tr>
      <td width="50%" align="center"><b>pgsql on sealos cloud</b></td>
      <td width="50%" align="center"><b>pgsql on sealos cloud</b></td>
  </tr>
  <tr>
     <td><img src="https://user-images.githubusercontent.com/8912557/205539807-4f148fca-aebb-4003-8ae2-49e7912ad7ad.png"/></td>
     <td><img src="https://user-images.githubusercontent.com/8912557/205539841-15192224-0b9a-4ad2-9a55-13019af092e8.png"/></td>
  </tr>
</table>

## Core features

- Manage clusters lifecycle
  - [x] Quickly install HA Kubernetes clusters
  - [x] Add / remove nodes, Clean the cluster
  - [ ] Backup and auto recovering, etc.
- Download and use OCI-compatible distributed applications
  - [x] OpenEBS, MinIO, Ingress, PostgreSQL, MySQL, Redis, etc.
- Customize your own distributed applications
  - [x] Using Dockerfile to build distributed applications images, saving all dependencies.
  - [x] Push distributed applications images to Docker Hub.
  - [x] Combine multiple applications to build your own cloud platform.
- sealos cloud
  - [x] Multi-tenant management
  - [ ] Application management
  - [x] Multi cloud cluster management, run user defined kubernetes and applications on any cloud.
  - [x] Run any distributed applications
  - [x] Cloud terminal
  - [x] App store

## Quickstart

> Installing an HA Kubernetes cluster with calico as CNI

Here `kubernetes:v1.24.0` and `calico:v3.24.1` are the cluster images in the registry which are fully compatible with OCI standard. Wonder if we can use flannel instead? Of course!

```shell script
# Download and install sealos. sealos is a golang binary so you can just download and copy to bin. You may also download it from release page.
$ wget  https://github.com/labring/sealos/releases/download/v4.1.4/sealos_4.1.4_linux_amd64.tar.gz  && \
    tar -zxvf sealos_4.1.4_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin 
# Create a cluster
$ sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```

* Supported Kubernetes versions: [240+ Kubernetes versions](https://hub.docker.com/r/labring/kubernetes/tags) [Kubernetes use cri-docker runtime](https://hub.docker.com/r/labring/kubernetes-docker/tags)
* Other distributed [applications images](https://hub.docker.com/u/labring)

> Single host

```shell
$ sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 --single
# remove taint
$ kubectl taint nodes --all node-role.kubernetes.io/master:NoSchedule-
```

> Building a custom cluster image

See [Building an Example CloudImage](https://www.sealos.io/docs/getting-started/build-example-cloudimage).

> Storage, message queue, database, etc.

Don't be shocked by the following:

```shell script
sealos run labring/helm:v3.8.2 # install helm
sealos run labring/openebs:v1.9.0 # install openebs
sealos run labring/minio-operator:v4.4.16 labring/ingress-nginx:4.1.0 \
   labring/mysql-operator:8.0.23-14.1 labring/redis-operator:3.1.4 # oneliner
```

And now everything is ready.

## Use cri-docker image

```shell
sealos run labring/kubernetes-docker:v1.20.8-4.1.4 labring/calico:v3.22.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```

## Links

- [Contribution Guidelines](./CONTRIBUTING.md)
- [Development Guide](./DEVELOPGUIDE.md)
- [sealosAction](https://github.com/labring/sealos-action)
- [Bug Verify Example](https://github.com/labring-actions/bug-verify)
- [Application Image](https://github.com/labring-actions/cluster-image)
- [Rootfs Image](https://github.com/labring-actions/runtime)
- [sealos 3.0(older version)](https://github.com/labring/sealos/tree/release-v3.3.9#readme) For older version users. Note that sealos 4.0 includes significant improvements, so please upgrade ASAP.
- [buildah](https://github.com/containers/buildah) Capabilities of buildah is widely used in sealos 4.0 to make cluster images compatible with container images and docker registry.

**Join us: [Telegram](https://t.me/cloudnativer), QQ Group(98488045), Wechat：fangnux**

<!-- ## License -->

<!-- [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_large) -->
