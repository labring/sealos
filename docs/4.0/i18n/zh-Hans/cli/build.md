import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 自定义构建应用镜像

## 基于 helm 构建 CloudImage

参考： [Building an Example CloudImage](../getting-started/build-example-cloudimage.md).

## 构建 calico 镜像

### 目录结构

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

### Dockerfile

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

该镜像不包含  kubernetes , 所以应该在已有 Kubernetes 集群中运行。

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

1. `CalicoImageList` ：docker镜像列表文件。
2. `cni` ：包含 `kubectl apply` 命令要执行的配置文件。
3. `registry` ：registry 镜像仓库数据保存目录。
4. `buildah build -t kubernetes-calico:1.24.0-amd64 --arch amd64 --os linux -f Kubefile .` ：构建 OCI 镜像。
5. `manifests` ：将 yaml 文件中的镜像解析到 docker 镜像列表中。

## 构建 calico 镜像

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

该镜像包含 kubernetes 和 calico。

```dockerfile
FROM labring/kubernetes:v1.24.0-amd64
COPY cni ./cni
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

  </TabItem>
  <TabItem value="multiple" label="Application images">

该镜像仅包含 calico。

```dockerfile
FROM scratch
COPY cni ./cni
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

  </TabItem>
</Tabs>

1. `cni`： 包含 `kubectl apply` 命令要执行的配置文件。
2. `buildah build -t kubernetes-calico:1.24.0-amd64 --arch amd64 --os linux -f Kubefile .` ：构建 OCI 镜像。

## 构建 openebs 镜像

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
2. `buildah build -t labring/kubernetes-calico-openebs:1.24.0-amd64 --arch amd64 --os linux -f Kubefile .` ：构建 OCI 镜像。

::: 建议

您需要将calico cmd添加到openebs cmd层，因为dockerfile会覆盖旧层。
:::

## 构建跨平台镜像

```shell
$ buildah build -t $prefix/oci-kubernetes:$version-amd64 --arch amd64 --os linux -f Kubefile  .
$ buildah build -t $prefix/oci-kubernetes:$version-arm64 --arch arm64 --os linux -f Kubefile  .

$ buildah login --username $username --password $password $domain
$ buildah push $prefix/oci-kubernetes:$version-amd64
$ buildah push $prefix/oci-kubernetes:$version-arm64
$ buildah manifest create $prefix/oci-kubernetes:$version
$ buildah manifest add $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version-amd64
$ buildah manifest add $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version-arm64
$ buildah manifest push --all $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version
```
