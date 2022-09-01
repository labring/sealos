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

Kubefile 内容：

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

`sealos build -t docker.io/labring/kubernetes-docker:v1.23.10 .` 即可

- 支持环境变量渲染
  - criData 默认值  /var/lib/docker
  - criDockerdData 默认值 /var/lib/cri-dockerd
  - registryData 默认值  /var/lib/registry
  - registryConfig 默认值 /etc/registry
  - registryDomain 默认值 sealos.hub
  - registryPort 默认值 5000
  - registryUsername 默认值 admin
  - registryPassword 默认值 passw0rd

- sealos 版本支持最低 4.1.0+

#### 如何解决docker的问题

- 其实k8s一直兼容的cri的接口,为了用户使用兼容了docker的接口
- 1.24开始k8s移除了dockershim的实现,这无疑是一个正确的选择
- image-cri-shim为了解决私有化镜像的问题使用cri实现了镜像模块,为了统一化docker镜像引入cri-dockerd统一使用cri对接docker
- kubelet的container模块对接cri-dockerd,而镜像模块统一对接image-cri-shim
- crictl的配置与kubelet一致,由于kubeadm images pull 需要使用crictl pull 镜像而且没有认证所以这里需要调整image-cri-shim去通过cri认证docker

#### 如何使用docker镜像

```shell
  sealos run docker.io/labring/kubernetes-docker:v1.23.10 --single
```
