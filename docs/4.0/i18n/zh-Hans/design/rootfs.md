# rootfs

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

Kubefile 内容, 其它文件内容可以 `sealos pull kubernetes:v1.24.0` 然后在 `/var/lib/sealos` 下面查看：

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

`sealos build -t kubernetes:v1.24.0 .` 即可