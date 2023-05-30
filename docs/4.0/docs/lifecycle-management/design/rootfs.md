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

Content of Kubefile(You can checkout the rest of the files by `sealos pull labring/kubernetes:v1.24.0` and then check `/var/lib/sealos`):

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
COPY .. .
```

`sealos build -t labring/kubernetes:v1.24.0 .` is all that is needed.

image-cri-shim can replace the registry address of images.

- online (default module)
- offline: You need to add imageList file in `images/shim`. Example imageList file: `ghcr.io/sealyun/lvscare:v1.1.3-beta.2 k8s.gcr.io/kube-apiserver:v1.24.0 k8s.gcr.io/kube-controller-manager:v1.24.0 k8s.gcr.io/kube-scheduler:v1.24.0 k8s.gcr.io/kube-proxy:v1.24.0 k8s.gcr.io/pause:3.5 k8s.gcr.io/etcd:3.5.0-0 k8s.gcr.io/coredns/coredns:v1.8.4`. image-cri-shim finds image in the imageList, and replace the `k8s.gcr.io/kube-apiserver:v1.24.0` with `sealos.hub:5000/kube-apiserver:v1.24.0`.
