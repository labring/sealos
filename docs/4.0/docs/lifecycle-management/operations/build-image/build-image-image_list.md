---
sidebar_position: 1
---

# 使用镜像列表构建集群镜像

本文将指导你如何使用镜像列表构建集群镜像，包括如何构建单个镜像（基于预先存在的 Kubernetes 镜像）或从零开始构建应用镜像。

## 目录结构

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

## Dockerfile 构建

我们可以将所有内容构建到单个镜像（`FROM labring/kubernetes`）中，或者使用 `FROM scratch` 从头开始构建镜像。

### 单个镜像

```dockerfile
FROM labring/kubernetes:v1.24.0
COPY cni ./cni
COPY images ./images
COPY registry ./registry
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

### 应用镜像

此镜像不包括 Kubernetes，因此它应在已安装 Kubernetes 的集群中运行。

```dockerfile
FROM scratch
COPY cni ./cni
COPY images ./images
COPY registry ./registry
COPY manifests ./manifests
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

说明：

1. `CalicoImageList`：Docker 镜像列表文件。
2. `cni`：`kubectl apply` 的配置文件。
3. `registry`：存储容器注册表数据的目录。
4. `sealos build -t kubernetes-calico:1.24.0-amd64 --platform linux/amd64 -f Kubefile .`：构建 OCI 镜像的命令。
5. `manifests`：将 yaml 文件中的镜像解析为 Docker 镜像列表。

## 构建 Calico 镜像

### 目录结构

```
.
├── Kubefile
├── cni
│   ├── custom-resources.yaml
│   └── tigera-operator.yaml
```

### Dockerfile 构建

#### 全部在一起

此镜像包括 Kubernetes 和 Calico。

```dockerfile
FROM labring/kubernetes:v1.24.0-amd64
COPY cni ./cni
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

#### 应用镜像

此镜像仅包含 Calico。

```dockerfile
FROM scratch
COPY cni ./cni
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

说明：

1. `cni`：`kubectl apply` 的配置文件。
2. `sealos build -t kubernetes-calico:1.24.0-amd64 --platform linux/amd64  -f Kubefile .`：构建 OCI 镜像的命令。

## 构建 OpenEBS 镜像

### 目录结构

```
.


├── Kubefile
├── cni
│   ├── custom-resources.yaml
│   └── tigera-operator.yaml
└── manifests
    └── openebs-operator.yaml
```

### Dockerfile 构建

#### 全部在一起

```dockerfile
FROM labring/oci-kubernetes-calico:1.24.0-amd64
COPY cni ./cni
COPY manifests ./manifests
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml","kubectl apply -f manifests/openebs-operator.yaml"]
```

#### 应用镜像

```dockerfile
FROM scratch
COPY cni ./cni
COPY manifests ./manifests
CMD ["kubectl apply -f manifests/openebs-operator.yaml"]
```

说明：

1. `cni`：`kubectl apply` 的配置文件。
2. `sealos build -t labring/kubernetes-calico-openebs:1.24.0-amd64 --platform linux/amd64  -f Kubefile .`：构建 OCI 镜像的命令。

建议：你需要将 Calico 的 CMD 添加到 OpenEBS 的 CMD 层，因为 Dockerfile 将覆盖较旧的层。