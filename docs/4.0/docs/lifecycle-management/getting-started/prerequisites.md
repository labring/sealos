---
sidebar_position: 0
---

## Prerequisites

Sealos is a simple go binary file that can be installed in most Linux Operating Systems.

Here are some basic installation requirements:

- Each cluster nodes should have different hostname.
- Time synchronization for all nodes.
- Run `sealos run` command on the first node of the kubernetes cluster,Currently, cluster installation is not supported on nodes outside the cluster.
- It's recommended to use clean OS (without Docker) to create clusters.
- Supports most Linux distributions,eg:Ubuntu CentOS Rocky linux.
- Support Kubernetes versions at [DockerHub](https://hub.docker.com/r/labring/kubernetes/tags).
- Support using containerd as container runtime.
- Use private IP if on public cloud.

## CPU Architecture  

Architectures released are `amd64` and `arm64`.  
