### rootfs

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

```dockerfile
FROM scratch
MAINTAINER sealyun
LABEL init="init.sh \$criData \$registryDomain \$registryPort \$registryUsername \$registryPassword"
LABEL version="v1.22.8"
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


image-cri-shim can replace image to registry addr

- offline
  if offline module,you need add imageList file in dir `images/shim` 
  example ImageList file is :
  `
  ghcr.io/sealyun/lvscare:v1.1.3-beta.2
  k8s.gcr.io/kube-apiserver:v1.22.8
  k8s.gcr.io/kube-controller-manager:v1.22.8
  k8s.gcr.io/kube-scheduler:v1.22.8
  k8s.gcr.io/kube-proxy:v1.22.8
  k8s.gcr.io/pause:3.5
  k8s.gcr.io/etcd:3.5.0-0
  k8s.gcr.io/coredns/coredns:v1.8.4
  `
  shim found image in imageList ,the  `k8s.gcr.io/kube-apiserver:v1.22.8` replace to `sealos.hub:5000/kube-apiserver:v1.22.8`
- online (default module)

