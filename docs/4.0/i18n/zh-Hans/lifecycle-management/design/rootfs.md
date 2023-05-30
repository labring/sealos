---
sidebar_position: 3
---

# Using containerd-rootfs

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
│   ├── cri-containerd-linux.tar.gz
│   ├── image-cri-shim
│   ├── lib64
│   │   ├── libseccomp.so.2
│   │   └── libseccomp.so.2.3.1
│   └── nerdctl
├── etc
│   ├── 10-kubeadm.conf
│   ├── config.toml
│   ├── containerd.service
│   ├── crictl.yaml
│   ├── hosts.toml
│   ├── image-cri-shim.service
│   ├── image-cri-shim.yaml.tmpl
│   ├── kubelet.service
│   ├── registry.yml.tmpl
│   └── registry_config.yml
├── images
│   ├── registry.tar
│   └── shim
│       └── DefaultImageList
├── opt
│   └── sealctl
├── registry
│   └── docker
│       └── registry
├── scripts
│   ├── auth.sh
│   ├── check.sh
│   ├── clean-containerd.sh
│   ├── clean-kube.sh
│   ├── clean-registry.sh
│   ├── clean-shim.sh
│   ├── clean.sh
│   ├── common.sh
│   ├── init-containerd.sh
│   ├── init-kube.sh
│   ├── init-registry.sh
│   ├── init-shim.sh
│   ├── init.sh
│   ├── kubelet-post-stop.sh
│   └── kubelet-pre-start.sh
└── statics
    └── audit-policy.yml
```

Kubefile 内容, 其它文件内容可以 `sealos pull labring/kubernetes:v1.24.0` 然后在 `/var/lib/sealos` 下面查看：

```dockerfile
FROM scratch
MAINTAINER sealyun
LABEL init="init.sh \$criData \$registryDomain \$registryPort \$registryUsername \$registryPassword"
LABEL version="v1.24.0"
LABEL image=""
LABEL clean="clean.sh \$criData"
LABEL check="check.sh"
LABEL init-registry="init-registry.sh \$registryPort \$registryData \$registryConfig"
LABEL clean-registry="clean-registry.sh \$registryData \$registryConfig"
LABEL auth="auth.sh"
ENV criData=/var/lib/containerd
ENV registryData=/var/lib/registry
ENV registryConfig=/etc/registry
ENV registryDomain=sealos.hub
ENV registryPort=5000
ENV registryUsername=admin
ENV registryPassword=passw0rd
COPY . .
```

`sealos build -t labring/kubernetes:v1.24.0 .` 即可。

image-cri-shim 则可以覆盖镜像的仓库地址。

- 在线安装（默认）
- 离线安装： 需要在 `images/shim` 目录下放置 imageList 文件，如 `ghcr.io/sealyun/lvscare:v1.1.3-beta.2 k8s.gcr.io/kube-apiserver:v1.24.0 k8s.gcr.io/kube-controller-manager:v1.24.0 k8s.gcr.io/kube-scheduler:v1.24.0 k8s.gcr.io/kube-proxy:v1.24.0 k8s.gcr.io/pause:3.5 k8s.gcr.io/etcd:3.5.0-0 k8s.gcr.io/coredns/coredns:v1.8.4`。image-cri-shim 在 imageList 中查找镜像，并将 `k8s.gcr.io/kube-apiserver:v1.24.0` 替换为 `sealos.hub:5000/kube-apiserver:v1.24.0`。
