---
sidebar_position: 1
---

# Building Cluster Images Based on the Image List

This document will guide you on how to build cluster images using the image list, including how to build a single image (based on pre-existing Kubernetes images) or build an application image from scratch.

## Directory Structure

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

## Dockerfile Building

We can build all content into a single image (`FROM labring/kubernetes`) or use `FROM scratch` to build the image from scratch.

### Single Image

```dockerfile
FROM labring/kubernetes:v1.24.0
COPY cni ./cni
COPY images ./images
COPY registry ./registry
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

### Application Image

This image does not include Kubernetes, so it should run in a cluster where Kubernetes is already installed.

```dockerfile
FROM scratch
COPY cni ./cni
COPY images ./images
COPY registry ./registry
COPY manifests ./manifests
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

Notes:

1. `CalicoImageList`: Docker image list file.
2. `cni`: Configuration files for `kubectl apply`.
3. `registry`: Directory for storing container registry data.
4. `sealos build -t kubernetes-calico:1.24.0-amd64 --platform linux/amd64 -f Kubefile .`: Command for building the OCI image.
5. `manifests`: Resolve images in the yaml file to a Docker image list.

## Building Calico Image

### Directory Structure

```
.
├── Kubefile
├── cni
│   ├── custom-resources.yaml
│   └── tigera-operator.yaml
```

### Dockerfile Building

#### All Together

This image includes both Kubernetes and Calico.

```dockerfile
FROM labring/kubernetes:v1.24.0-amd64
COPY cni ./cni
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

#### Application Image

This image only contains Calico.

```dockerfile
FROM scratch
COPY cni ./cni
CMD ["kubectl apply -f cni/tigera-operator.yaml","kubectl apply -f cni/custom-resources.yaml"]
```

Notes:

1. `cni`: Configuration files for `kubectl apply`.
2. `sealos build -t kubernetes-calico:1.24.0-amd64 --platform linux/amd64  -f Kubefile .`: Command for building the OCI image.

## Building OpenEBS Image

### Directory Structure

```
.
├── Kubefile
├── cni
│   ├── custom-resources.yaml
│   └── tigera-operator.yaml
└── manifests
    └── openebs-operator.yaml
```

### Dockerfile Building

#### All Together

```dockerfile
FROM labring/oci-kubernetes-calico:1.24.0-amd64
COPY cni ./cni
COPY manifests ./manifests
CMD ["kubectl apply -f cni/tigera

-operator.yaml","kubectl apply -f cni/custom-resources.yaml","kubectl apply -f manifests/openebs-operator.yaml"]
```

#### Application Image

```dockerfile
FROM scratch
COPY cni ./cni
COPY manifests ./manifests
CMD ["kubectl apply -f manifests/openebs-operator.yaml"]
```

Notes:

1. `cni`: Configuration files for `kubectl apply`.
2. `sealos build -t labring/kubernetes-calico-openebs:1.24.0-amd64 --platform linux/amd64  -f Kubefile .`: Command for building the OCI image.

Recommendation: You need to add the CMD of Calico to the CMD layer of OpenEBS because the Dockerfile will overwrite older layers.
