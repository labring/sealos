import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Customize applications image

## Build a CloudImage from helm

See [Building an Example CloudImage](../getting-started/build-example-cloudimage.md).

## Build calico image

### Directory structure

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

We can build everything into a single image (`FROM labring/kubernetes`),
or we can build applications images where `FROM scratch` is used.

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

This image will not contains kubernetes, should run it on an already exist cluster.

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

1. `CalicoImageList` is docker image list file.
2. `cni` contains kubectl apply config files.
3. `registry` is the registry data directory.
4. `sealos build -t kubernetes-calico:1.24.0-amd64 --platform linux/amd64   -f Kubefile .` builds the oci image.
5. `manifests` parse yaml images to docker image list.

## Build calico image

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
  
This image contains kubernetes and calico.

```dockerfile
FROM labring/kubernetes:v1.24.0-amd64
COPY cni ./cni
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

  </TabItem>
  <TabItem value="multiple" label="Application images">

Only has calico images

```dockerfile
FROM scratch
COPY cni ./cni
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

  </TabItem>
</Tabs>

1. `cni` contains kubectl apply config files
2. `sealos build -t kubernetes-calico:1.24.0-amd64 --platform linux/amd64  -f Kubefile .` builds the oci image.

## Build openebs image

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

1. `cni` contains kubectl apply config files
2. `sealos build -t labring/kubernetes-calico-openebs:1.24.0-amd64 --platform linux/amd64  -f Kubefile .` builds the oci image.

:::tip
You'll need to add calico cmd to openebs cmd layer, because dockerfile overrides the old layer.
:::

## Build multi-architecture images

### Download buildah for x86_64 platform
```shell
wget -qO "buildah" https://github.com/labring/cluster-image/releases/download/depend/buildah.linux.amd64  && \
  chmod a+x buildah && mv buildah /usr/bin
```
### Download buildah for aarch64 platform
```shell
wget -qO "buildah" https://github.com/labring/cluster-image/releases/download/depend/buildah.linux.arm64  && \
  chmod a+x buildah && mv buildah /usr/bin
```

### Cross-platform build image

```shell
$ sealos build -t $prefix/oci-kubernetes:$version-amd64 --platform linux/amd64  -f Kubefile  .
$ sealos build -t $prefix/oci-kubernetes:$version-arm64 --platform linux/arm64  -f Kubefile  .

$ buildah login --username $username --password $password $domain
$ buildah push $prefix/oci-kubernetes:$version-amd64
$ buildah push $prefix/oci-kubernetes:$version-arm64
$ buildah manifest create $prefix/oci-kubernetes:$version
$ buildah manifest add $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version-amd64
$ buildah manifest add $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version-arm64
$ buildah manifest push --all $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version
```
