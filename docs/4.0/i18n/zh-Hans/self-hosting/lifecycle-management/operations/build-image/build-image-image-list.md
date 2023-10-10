---
sidebar_position: 1
---

# 构建基于镜像清单的集群镜像

本文将指导你如何使用镜像列表构建集群镜像，或使用现有的docker存储的tar包进行构建应用镜像。

## 镜像列表 构建

```
.
├── Kubefile
├── cni
│   ├── custom-resources.yaml
│   └── tigera-operator.yaml
├── images
│   └── shim
│       └── CalicoImageList
└── registry
    └── docker
        └── registry
```

```dockerfile
FROM labring/kubernetes:v1.24.0
COPY cni ./cni
COPY images ./images
COPY registry ./registry
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

说明：

CalicoImageList 中的镜像列表将被拉取到本地，然后使用 `kubectl apply -f` 命令将其应用到集群中。

镜像列表目前支持:
- docker.io/calico/cni:v3.20.0 这种远程的镜像
- containers-storage:docker.io/labring/coredns:v0.0.1 这种本地的OCI容器镜像
- docker-daemon:docker.io/library/nginx:latest 这种本地的docker容器镜像


## 镜像tar包 构建

```
.
├── Kubefile
├── cni
│   ├── custom-resources.yaml
│   └── tigera-operator.yaml
├── images
│   └── skopeo
│       ├── calico.tar
│       └── tar.txt
└── registry
    └── docker
        └── registry
```

```dockerfile
FROM scratch
COPY cni ./cni
COPY images ./images
COPY registry ./registry
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

说明：

tar.txt 中的配置会被拉取到本地并重定向镜像列表，然后使用 `kubectl apply -f` 命令将其应用到集群中。
配置文件格式:

```
docker-archive:calico.tar@calico/cni:v3.20.0
```

镜像列表目前支持:
- docker-archive 这种docker存储的镜像，仅支持单个镜像
- oci-archive 这种oci存储的镜像，仅支持单个镜像
