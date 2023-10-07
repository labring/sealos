---
sidebar_position: 1
---

# Building Cluster Images Based on Image Manifests

This guide will walk you through the process of building cluster images using image manifests or using existing tarballs stored in Docker.

## Building from Image Manifests

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

Explanation:

The images listed in CalicoImageList will be pulled locally and then applied to the cluster using the `kubectl apply -f` command.

The image manifest currently supports the following:
- Remote images like docker.io/calico/cni:v3.20.0
- Local OCI container images like containers-storage:docker.io/labring/coredns:v0.0.1
- Local Docker container images like docker-daemon:docker.io/library/nginx:latest

## Building from Image Tarballs

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

Explanation:

The configurations in tar.txt will be pulled locally and redirected to the image list. Then, they will be applied to the cluster using the `kubectl apply -f` command. The configuration file format is as follows:

```
docker-archive:calico.tar@calico/cni:v3.20.0
```

The image manifest currently supports the following:
- Docker archive images, supporting a single image, like docker-archive
- OCI archive images, supporting a single image, like oci-archive
