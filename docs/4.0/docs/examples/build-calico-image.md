import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Build Calico image

## Directory structure

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

We can build everything into a single image(`FROM labring/kubernetes`), or use `FROM scratch` instead to build the image from scratch.

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

This image does not include Kubernetes, so it should be run in a cluster with Kubernetes installed.

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

1. `CalicoImageList`: Docker image list file.
2. `cni`: Configuration files for `kubectl apply`.
3. `registry`: Directory storing container registry data.
4. `buildah build -t kubernetes-calico:1.24.0-amd64 --arch amd64 --os linux -f Kubefile .`: Build OCI image.
5. `manifests`: Parse images in yaml files to Docker image list.

## Build Calico image

### Directory structure

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

This image includes Kubernetes and Calico.

```dockerfile
FROM labring/kubernetes:v1.24.0-amd64
COPY cni ./cni
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

  </TabItem>
  <TabItem value="multiple" label="Application images">

This image includes Calico only.

```dockerfile
FROM scratch
COPY cni ./cni
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

  </TabItem>
</Tabs>

1. `cni`: Configuration files for `kubectl apply`.
2. `buildah build -t kubernetes-calico:1.24.0-amd64 --arch amd64 --os linux -f Kubefile .`: Build OCI image.

## Build OpenEBS image

### Directory structure

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

1. `cni`: Configuration files for `kubectl apply`.
2. `buildah build -t labring/kubernetes-calico-openebs:1.24.0-amd64 --arch amd64 --os linux -f Kubefile .`: Build OCI image.

::: Suggestions

You need to add Calico CMD to OpenEBS CMD layer, as Dockerfile will overwrite the older layer.

:::

## Build cross-platform images

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
