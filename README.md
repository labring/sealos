<a href="https://trackgit.com">
   <img src="https://us-central1-trackgit-analytics.cloudfunctions.net/token/ping/kof6vgldhbx8pzyxyfck" alt="trackgit-views" />
</a>

<div align="center">
  <p>
    <b>Popularize cloud native technologies with ease</b>
  </p>
  <p>

[![Awesome](https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg)](https://github.com/labring/sealos)
[![Open in Dev Container](https://img.shields.io/static/v1?label=Dev%20Container&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/labring/sealos)
[![Build Status](https://github.com/labring/sealos/actions/workflows/release.yml/badge.svg)](https://github.com/labring/sealos/actions)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_shield)
[![codecov](https://codecov.io/gh/labring/sealos/branch/main/graph/badge.svg?token=e41ZDcj06N)](https://codecov.io/gh/labring/sealos)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fpostwoman.io&logo=Postwoman)](https://sealyun.com)
[![OSCS Status](https://www.oscs1024.com/platform/badge/labring/sealos.svg?size=small)](https://www.oscs1024.com/project/labring/sealos?ref=badge_small)
[![Chat on Telegram](https://img.shields.io/badge/chat-Telegram-blueviolet?logo=Telegram)](https://t.me/cloudnativer)

  </p>
</div>

---

[Docs](https://www.sealos.io/docs/Intro) | [简体中文](https://www.sealos.io/zh-Hans/docs/Intro)

## Run a Kubernetes cluster

[![asciicast](https://asciinema.org/a/519263.svg)](https://asciinema.org/a/519263?speed=3)

## What is sealos

**sealos is a cloud operating system distribution based on Kubernetes.**

![](https://user-images.githubusercontent.com/8912557/173866494-379ba0dd-05af-4095-b63d-08f594581c52.png)

- From now on, think of all your machines as an abstract supercomputer whose operating system is sealos, where Kubernetes serves as the OS kernel.
- Instead of IaaS, PaaS and SaaS, there will only be cloud OS drivers(CSI, CNI and CRI implementations), cloud OS kernel(Kubernetes) and distributed applications.

## This is not win11 but sealos desktop

Use the cloud like a PC desktop, Freely run and uninstall any distributed applications:

![](https://user-images.githubusercontent.com/8912557/191533678-6ab8915e-23c7-456e-b0c0-506682c001fb.png)

Some Screen Shots of `sealos`:

<table>
  <tr>
      <td width="50%" align="center"><b>redis on sealos cloud</b></td>
      <td width="50%" align="center"><b>redis on sealos cloud</b></td>
  </tr>
  <tr>
     <td><img src="https://user-images.githubusercontent.com/8912557/196186025-9053295f-4356-42b6-adf2-064a614bca57.png"/></td>
     <td><img src="https://user-images.githubusercontent.com/8912557/196186714-5ab92925-be86-4305-9e46-66dd9dc3edb5.png"/></td>
  </tr>
  <tr>
      <td width="50%" align="center"><b>pgsql on sealos cloud</b></td>
      <td width="50%" align="center"><b>pgsql on sealos cloud</b></td>
  </tr>
  <tr>
     <td><img src="https://user-images.githubusercontent.com/8912557/196185833-1b5c7a35-32e8-4f75-a52f-8b089ccbe8a4.png"/></td>
     <td><img src="https://user-images.githubusercontent.com/8912557/196186330-cf526d0a-46b1-4938-842c-c7a90d79f97e.png"/></td>
  </tr>
</table>

## Core features

- Manage clusters lifecycle
  - [x] Quickly install HA Kubernetes clusters
  - [x] Add / remove nodes
  - [x] Clean the cluster, backup and auto recovering, etc.
- Download and use OCI-compatible distributed applications
  - [x] OpenEBS, MinIO, Ingress, PostgreSQL, MySQL, Redis, etc.
- Customize your own distributed applications
  - [x] Using Dockerfile to build distributed applications images, saving all dependencies.
  - [x] Push distributed applications images to Docker Hub.
  - [x] Combine multiple applications to build your own cloud platform.
- Sealos cloud
  - [x] Run any distributed applications
  - [x] Have a full public cloud capability, and run it anywhere

## Quickstart

> Installing an HA Kubernetes cluster with calico as CNI

Here `kubernetes:v1.24.0` and `calico:v3.24.1` are the cluster images in the registry which are fully compatible with OCI standard. Wonder if we can use flannel instead? Of course!

```shell script
# Download and install sealos. sealos is a golang binary so you can just download and copy to bin. You may also download it from release page.
$ wget  https://github.com/labring/sealos/releases/download/v4.1.3/sealos_4.1.3_linux_amd64.tar.gz  && \
    tar -zxvf sealos_4.1.3_linux_amd64.tar.gz sealos &&  chmod +x sealos && mv sealos /usr/bin 
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
$ kubectl taint node --all node-role.kubernetes.io/control-plane-
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
sealos run labring/kubernetes-docker:v1.20.5-4.1.3 labring/calico:v3.24.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```

## Links

- [Contribution Guidelines](./CONTRIBUTING.md)
- [Development Guide](./DEVELOPGUIDE.md)
- [sealosAction](https://github.com/marketplace/actions/auto-install-k8s-using-sealos)
- [sealos 3.0(older version)](https://github.com/labring/sealos/tree/release-v3.3.9#readme) For older version users. Note that sealos 4.0 includes significant improvements, so please upgrade ASAP.
- [buildah](https://github.com/containers/buildah) Capabilities of buildah is widely used in sealos 4.0 to make cluster images compatible with container images and docker registry.

**Join us: [Telegram](https://t.me/cloudnativer), QQ Group(98488045), Wechat：fangnux**

<!-- ## License -->

<!-- [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_large) -->
