---
sidebar_position: 4
---

# Using docker-rootfs

```
.
├── Kubefile
├── README.md
├── bin
│   ├── conntrack
│   ├── kubeadm
│   ├── kubectl
│   └── kubelet
├── cri
│   ├── cri-dockerd.tgz
│   ├── crictl.tar.gz
│   ├── docker.tgz
│   ├── image-cri-shim
│   └── lib64
├── etc
│   ├── 10-kubeadm.conf
│   ├── cri-docker.service
│   ├── cri-docker.service.tmpl
│   ├── cri-docker.socket
│   ├── crictl.yaml
│   ├── daemon.json
│   ├── daemon.json.tmpl
│   ├── docker.service
│   ├── image-cri-shim.service
│   ├── image-cri-shim.yaml
│   ├── image-cri-shim.yaml.tmpl
│   ├── kubelet-flags.env
│   ├── kubelet.service
│   ├── registry.yml
│   ├── registry.yml.tmpl
│   ├── registry_config.yml
│   ├── registry_config.yml.tmpl
│   └── registry_htpasswd
├── images
│   ├── registry.tar
│   └── shim
│       ├── DefaultImageList
│       └── LvscareImageList
├── opt
│   ├── lsof
│   └── sealctl
├── registry
│   └── docker
│       └── registry
├── scripts
│   ├── auth.sh
│   ├── check.sh
│   ├── clean-cri-dockerd.sh
│   ├── clean-docker.sh
│   ├── clean-kube.sh
│   ├── clean-registry.sh
│   ├── clean-shim.sh
│   ├── clean.sh
│   ├── common.sh
│   ├── init-cri-dockerd.sh
│   ├── init-docker.sh
│   ├── init-kube.sh
│   ├── init-registry.sh
│   ├── init-shim.sh
│   ├── init.sh
│   ├── kubelet-post-stop.sh
│   └── kubelet-pre-start.sh
└── statics
    └── audit-policy.yml

```

Kubefile content：

```dockerfile
FROM scratch
MAINTAINER sealyun
LABEL init="init.sh"
LABEL version="v0.0.0"
LABEL image="__lvscare__"
LABEL clean="clean.sh \$criData \$criDockerdData"
LABEL check="check.sh \$registryData"
LABEL init-registry="init-registry.sh \$registryData \$registryConfig"
LABEL clean-registry="clean-registry.sh \$registryData \$registryConfig"
LABEL auth="auth.sh \$registryDomain \$registryPort \$registryUsername \$registryPassword"
LABEL sealos.io.type="rootfs"
ENV criData=/var/lib/docker
ENV criDockerdData=/var/lib/cri-dockerd
ENV registryData=/var/lib/registry
ENV registryConfig=/etc/registry
ENV registryDomain=sealos.hub
ENV registryPort=5000
ENV registryUsername=admin
ENV registryPassword=passw0rd
COPY . .
```

`sealos build -t kubernetes-docker:v1.23.10 .` is all that is needed.

- Support environment variable rendering
  - criData Defaults `/var/lib/docker`
  - criDockerdData Defaults `/var/lib/cri-dockerd`
  - registryData Defaults `/var/lib/registry`
  - registryConfig Defaults `/etc/registry`
  - registryDomain Defaults `sealos.hub`
  - registryPort Defaults `5000`
  - registryUsername Defaults `admin`
  - registryPassword Defaults `passw0rd`

- sealos Minimum supported version 4.1.0+

#### How to solve problems with Docker

- In fact, kubernetes has always been compatible with the cri interface, in order for users to use the docker-compatible interface.
- Since 1.24, kubernetes has removed the implementation of dockershim, which is undoubtedly a correct choice.
- In order to solve the problem of privatized docker or containerd images, image-cri-shim uses cri to implement the image module. In order to unify docker images, cri-dockerd is introduced to use cri to connect to docker.
- The container module of kubelet is connected to cri-dockerd, and the image module is unified to image-cri-shim.
- The configuration of crictl is the same as kubelet. Since kubeadm images pull needs to use crictl to pull the image and there is no authentication, it is necessary to adjust image-cri-shim that pass cri authentication to docker.

#### How to use Docker images

```shell
sealos run docker.io/labring/kubernetes-docker:v1.23.10 --single
```
