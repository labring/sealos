---
sidebar_position: 10
---

# Kubernetes Cluster Image Documentation

This document provides an overview of the rootfs-type cluster images offered by Sealos, including the image names, types, and versions.

## Image Names

The official cluster images provided by Sealos include the following:

1. kubernetes: Kubernetes image with containerd as the container runtime interface (CRI).
2. kubernetes-docker: Kubernetes image with Docker as the CRI.
3. kubernetes-crio: Kubernetes image with Crio as the CRI.

Currently, Sealos primarily provides Kubernetes-related images and has not yet provided other types of cluster images such as k3s or k0s.

## Image Types

Sealos offers different types of Kubernetes cluster images based on the container runtime interface (CRI):

1. Kubernetes image with containerd as the CRI.
2. Kubernetes image with Docker as the CRI.
3. Kubernetes image with Crio as the CRI.

Users can choose the appropriate image type based on their requirements and preferences.

## Image Versions

Sealos offers multiple versions of cluster images. Examples include:

### 1. Development Version

This version is suitable for users who want to try out the latest features of the project. The development version may contain new features and improvements that have not been thoroughly tested and may not be as stable.

Example: `v1.26(v1.26-amd64/v1.26-arm64)`

### 2. Latest Version

The latest version is typically more stable than the development version but may not include all the new features. This version is recommended for most users.

Example: `v1.26.0(v1.26.0-amd64/v1.26.0-arm64)`

### 3. Release Version (Including Historical Versions)

The release version includes historical versions. Release versions have usually undergone rigorous testing and are considered stable.

Example: `v1.26.0-4.1.5(v1.26.0-4.1.5-amd64/v1.26.0-4.1.5-arm64)` `4.1.5` is the corresponding version number for Sealos.

When choosing an image version, users should consider their requirements and preferences. Additionally, Sealos provides sub-versions for different processor architectures to meet the needs of users on different hardware platforms.

## Summary

This document provides an overview of the rootfs-type cluster images offered by Sealos, including the image names, types, and versions. Users can select the appropriate image type and version based on their requirements and preferences to run containers in a Kubernetes cluster.
