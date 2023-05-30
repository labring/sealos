---
sidebar_position: 6
---

# Sealos Cluster Image Guide

This document mainly introduces the rootfs-type cluster images provided by Sealos, including image names, image types, and image versions.

## Image Name

Sealos officially released cluster images mainly include the following:

1. kubernetes: Kubernetes image with containerd as the container runtime (CRI).
2. kubernetes-docker: Kubernetes image with docker as the container runtime (CRI).
3. kubernetes-crio: Kubernetes image with crio as the container runtime (CRI).

Currently, Sealos mainly provides Kubernetes related images, and other types of cluster images, such as k3s, k0s, etc., are not yet available.

## Image Type

According to the different container runtimes (CRI), Sealos provides different types of Kubernetes cluster images:

1. Kubernetes image with containerd as CRI.
2. Kubernetes image with docker as CRI.
3. Kubernetes image with crio as CRI.

Users can choose the appropriate image type according to their needs and preferences.

## Image Version

Sealos officially provides multiple versions of cluster images to choose from, such as:

### 1. Development version

Suitable for users who want to try the latest features of the project. The development version may contain new features and improvements that have not been fully tested and may not be stable.

Example: `v1.26(v1.26-amd64/v1.26-arm64)`

### 2. Latest version

Generally more stable than the development version, but may not include all new features. This is the version recommended for most users.

Example: `v1.26.0(v1.26.0-amd64/v1.26.0-arm64)`

### 3. Release version (includes historical versions)

The release version, which includes historical versions. The release version is usually rigorously tested and considered stable.

Example: `v1.26.0-4.1.5(v1.26.0-4.1.5-amd64/v1.26.0-4.1.5-arm64)` `4.1.5` is the corresponding version number of sealos.

When choosing an image version, users need to choose the appropriate version according to their needs and preferences. In addition, Sealos also provides sub-versions for different processor architectures to meet user needs on different hardware platforms.

## Conclusion

This document describes the rootfs-type cluster images provided by Sealos, including image names, image types, and image versions. Users can choose from different image types and versions according to their needs and preferences to run containers in the Kubernetes cluster.
