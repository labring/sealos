<a href="https://trackgit.com">
  <img src="https://us-central1-trackgit-analytics.cloudfunctions.net/token/ping/kexrkhvqjlzkdiap4zke" alt="trackgit-views" />
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

[Docs](https://sealos.io) | [简体中文](https://www.sealos.io/zh-Hans/)

## What is sealos

**sealos is a cloud operating system distribution with Kubernetes as its kernel.**

In the early stages, operatings systems have adopted a layered architecture, which later evolved into kernel architecture like Linux and Windows. With the emergence of container technologies, cloud OS will migrate to a "cloud kernel" architecture with strong cohesion in the future.

![](https://user-images.githubusercontent.com/8912557/173866494-379ba0dd-05af-4095-b63d-08f594581c52.png)

- From now on, think of all your machines as an abstract supercomputer whose operating system is sealos, where Kubernetes serves as the OS kernel.
- Instead of IaaS, PaaS and SaaS, there will only be cloud OS drivers(CSI, CNI and CRI implementations), cloud OS kernel(Kubernetes) and distributed applications.

> Core Capabilities

- Cluster image
  - [x] The entire cluster will be able to build, ship and run.
  - [x] Semantics of docker will be extended to clusters so that any distributed applications can be defined and run smoothly.
- hub.sealos
  - [x] A cluster image repository where you can retrieve pre-built distributed applications such as basic Kubernetes cluster image, high availability pgsql cluster image, high availability minio cluster image, etc.
- desktop.sealos
  - [ ] A desktop for cloud OS, not to be confused with traditional cloud desktop. It is similar to macOS, but manages cluster and distributed applications instead of personal computers.
- Distributed application matrix
  - [x] Anything you need including storage / network / HA database / message queue / monitoring can be retrieved with a click of the mouse, or simply `sealos run`.
  - [x] sealos now support 20+ HA applications.

## Core features

- Manage clusters lifecycle
  - [x] Quickly install HA Kubernetes clusters
  - [x] Add / remove nodes
  - [x] Clean the cluster, backup and auto recovering, etc.
- Download and use OCI-compatible distributed applications
  - [x] OpenEBS, MinIO, Ingress, PostgreSQL, MySQL, Redis, etc.
- Customize you own distributed applications
  - [x] Using Dockerfile to build distributed applications images, saving all dependencies.
  - [x] Push distributed applications images to Docker Hub.
  - [x] Combine multiple applications to build your own cloud platform.

## Quickstart

> Installing an HA kubernetes cluster with calico as CNI

Here `kubernetes:v1.24.0` and `calico:v3.22.1` are the cluster images in the registry which are fully compatible with OCI standard. Wonder if we can use flannel instead? Of course!

```shell script
# Download and install sealos. sealos is a golang binary so you can just download and copy to bin. You may also download it from release page.
$ wget https://github.com/labring/sealos/releases/download/v4.0.0/sealos_4.0.0_linux_amd64.tar.gz \
   && tar zxvf sealos_4.0.0_linux_amd64.tar.gz && chmod +x sealos && mv sealos /usr/bin
# Create a cluster
$ sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```

> Building a custom cluster image

See [Building an Example CloudImage](https://www.sealos.io/docs/examples/build-example-cloudimage).

> Storage, message queue, database, etc.

Don't be shocked by the following:

```shell script
sealos run labring/helm:v3.8.2 # install helm
sealos run labring/openebs:v1.9.0 # install openebs
sealos run labring/minio-operator:v4.4.16 labring/ingress-nginx:4.1.0 \
   labring/mysql-operator:8.0.23-14.1 labring/redis-operator:3.1.4 # oneliner
```

And now everything is ready.

## Links

- [Contribution Guidelines](./CONTRIBUTING.md)
- [Development Guide](./DEVELOPGUIDE.md)
- [sealos 3.0(older version)](https://github.com/labring/sealos/tree/release-v3.3.9#readme) For older version users. Note that sealos 4.0 includes significant improvements, so please upgrade ASAP.
- [buildah](https://github.com/containers/buildah) Capabilities of buildah is widely used in sealos 4.0 to make cluster images compatible with container images and docker registry.
- [sealer](https://github.com/sealerio/sealer) Capabilities of sealer is widely used in sealos 4.0 to make Clusterfile compatible with sealer, some module forked sealer source code.

**Join us: [Telegram](https://t.me/cloudnativer), QQ Group(98488045), Wechat：fangnux**

## License

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Flabring%2Fsealos.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Flabring%2Fsealos?ref=badge_large)
