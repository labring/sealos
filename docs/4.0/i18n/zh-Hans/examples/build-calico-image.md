import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 构建 Calico 镜像

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

## Dockerfile

我们可以将所有内容构建到单个镜像中 (`FROM labring/kubernetes`),或者我们也可以使用 `FROM scratch` 指令从零构建应用镜像。

<Tabs groupId="imageNum">
  <TabItem value="single" label="Single image" default>

```dockerfile
FROM labring/kubernetes:v1.24.0
COPY cni ./cni
COPY images ./images
COPY registry ./registry
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

  </TabItem>
  <TabItem value="application" label="Application images">

该镜像不包含 Kubernetes , 所以应该在已有 Kubernetes 集群中运行。

```dockerfile
FROM scratch
COPY cni ./cni
COPY images ./images
COPY registry ./registry
COPY manifests ./manifests
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

  </TabItem>
</Tabs>

1. `CalicoImageList`：Docker 镜像列表文件。
2. `cni`：包含 `kubectl apply` 命令要执行的配置文件。
3. `registry`：registry 镜像仓库数据保存目录。
4. `sealos build -t kubernetes-calico:1.24.0-amd64 --platform linux/amd64 --os linux -f Kubefile .`：构建 OCI 镜像。
5. `manifests`：将 yaml 文件中的镜像解析到 Docker 镜像列表中。

## 构建 Calico 镜像

### 目录结构

```
.
├── Kubefile
├── cni
│   ├── custom-resources.yaml
│   └── tigera-operator.yaml
```

### Dockerfile

<Tabs groupId="imageNum">
  <TabItem value="single" label="All in one" default>

该镜像包含 Kubernetes 和 Calico。

```dockerfile
FROM labring/kubernetes:v1.24.0-amd64
COPY cni ./cni
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

  </TabItem>
  <TabItem value="multiple" label="Application images">

该镜像仅包含 Calico。

```dockerfile
FROM scratch
COPY cni ./cni
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

  </TabItem>
</Tabs>

1. `cni`：包含 `kubectl apply` 命令要执行的配置文件。
2. `sealos build -t kubernetes-calico:1.24.0-amd64 --platform linux/amd64  -f Kubefile .`：构建 OCI 镜像。

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

### Dockerfile

<Tabs groupId="imageNum">
  <TabItem value="single" label="All in one" default>

```dockerfile
FROM labring/oci-kubernetes-calico:1.24.0-amd64
COPY cni ./cni
COPY manifests ./manifests
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml","kubectl apply -f manifests/openebs-operator.yaml"]
```

  </TabItem>
  <TabItem value="multiple" label="Application images">

```dockerfile
FROM scratch
COPY cni ./cni
COPY manifests ./manifests
CMD ["kubectl apply -f manifests/openebs-operator.yaml"]
```

  </TabItem>
</Tabs>

1. `cni` ： 包含 `kubectl apply` 命令要执行的配置文件。
2. `sealos build -t labring/kubernetes-calico-openebs:1.24.0-amd64 --platform linux/amd64 -f Kubefile .` ：构建 OCI 镜像。

::: 建议

您需要将 Calico CMD 添加到 OpenEBS CMD 层，因为 Dockerfile 会覆盖旧层。

:::

## 构建跨平台镜像

### 下载 x86_64 架构的buildah
```shell
wget -qO "buildah" https://github.com/labring/cluster-image/releases/download/depend/buildah.linux.amd64  && \
  chmod a+x buildah && mv buildah /usr/bin
```
### 下载 aarch64 构架的buildah
```shell
wget -qO "buildah" https://github.com/labring/cluster-image/releases/download/depend/buildah.linux.arm64  && \
  chmod a+x buildah && mv buildah /usr/bin
```

### 多架构构建镜像

```shell
$ sealos build -t $prefix/oci-kubernetes:$version-amd64 --platform linux/amd64 -f Kubefile  .
$ sealos build -t $prefix/oci-kubernetes:$version-arm64 --platform linux/arm64 -f Kubefile  .

$ buildah login --username $username --password $password $domain
$ buildah push $prefix/oci-kubernetes:$version-amd64
$ buildah push $prefix/oci-kubernetes:$version-arm64
$ buildah manifest create $prefix/oci-kubernetes:$version
$ buildah manifest add $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version-amd64
$ buildah manifest add $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version-arm64
$ buildah manifest push --all $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version
```
