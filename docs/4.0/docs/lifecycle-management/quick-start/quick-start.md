---
sidebar_position: 2
---

# Quick Start

## Prerequisites

Sealos is a simple Go binary that can be installed on most Linux operating systems.

Here are some basic installation requirements:

- Each cluster node should have a unique hostname. Hostnames should not contain underscores.
- Time synchronization across all nodes.
- Run the `sealos run` command on the first node of the Kubernetes cluster. Currently, cluster installation is not supported from outside the cluster.
- It is recommended to use a clean operating system to create the cluster. Do not install Docker manually.
- Supported on most Linux distributions, such as Ubuntu, CentOS, and Rocky Linux.
- Supports Kubernetes versions supported in [DockerHub](https://hub.docker.com/r/labring/kubernetes/tags).
- Supports containerd as the container runtime.
- For public cloud deployments, use private IP addresses.

### CPU Architecture

Currently, `amd64` and `arm64` architectures are supported.

## Single-node Kubernetes Installation

```shell
# sealos version must >= v4.1.0
$ sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 --single
```

## Multi-node Kubernetes Installation

```shell
$ sealos run labring/kubernetes:v1.25.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```

Parameter explanation:

| Parameter | Example Value   | Description                              |
| --------- | --------------- | ---------------------------------------- |
| --masters | 192.168.0.2    | Kubernetes master node address list       |
| --nodes   | 192.168.0.3    | Kubernetes node address list              |
| --ssh-passwd | [your-ssh-passwd] | SSH login password                   |
| kubernetes | labring/kubernetes:v1.25.0 | Kubernetes image |

Execute the above command directly on a clean server without any additional operations to start a highly available Kubernetes cluster.

## Install Various Distributed Applications

```shell
sealos run labring/helm:v3.8.2 # install helm
sealos run labring/openebs:v1.9.0 # install openebs
sealos run labring/minio-operator:v4.4.16 labring/ingress-nginx:4.1.0 \
   labring/mysql-operator:8.0.23-14.1 labring/redis-operator:3.1.4 # oneliner
```

With the above commands, you will have highly available MySQL, Redis, and more, without worrying about dependencies.

## Adding Nodes

Add a node:
```shell
$ sealos add --nodes 192.168.64.21,192.168.64.19 
```

Add a master node:
```shell
$ sealos add --masters 192.168.64.21,192.168.64.19 
```

## Deleting Nodes

Delete a node:
```shell
$ sealos delete --nodes 192.168.64.21,192.168.64.19 
```

Delete a master node:
```shell
$ sealos delete --masters 192.168.64.21,192.168.64.19  
```

## Cleaning up the Cluster

```shell
$ sealos reset
```

## Offline Delivery



For offline environments, you only need to import the images in advance. The remaining steps are the same as online installation.

First, save the installation package in an environment with internet access:
```shell
$ sealos pull labring/kubernetes:v1.25.0
$ sealos save -o kubernetes.tar labring/kubernetes:v1.25.0
```
### Loading Images and Installation

Copy the `kubernetes.tar` file to the offline environment and use the `load` command to import the images:

```shell
$ sealos load -i kubernetes.tar
```

The remaining installation steps are the same as the online installation.
```shell
$ sealos images # check if the cluster images are successfully imported
$ sealos run kubernetes:v1.25.0  # Single-node installation, similar for cluster installation
```

### Quick Start with Cluster Image

```shell
$ sealos run kubernetes.tar # Single-node installation, similar for cluster installation
```


## Cluster Image Version Support

### Kubernetes with containerd (Kubernetes version >=1.18.0)

| Kubernetes Version | Sealos Version       | CRI Version | Image Version                   |
| ------------------ | -------------------- | ----------- | ------------------------------- |
| `<1.25`            | `>=v4.0.0`           | v1alpha2    | labring/kubernetes:v1.24.0 |
| `>=1.25`           | `>=v4.1.0`           | v1alpha2    | labring/kubernetes:v1.25.0 |
| `>=1.26`           | `>=v4.1.4-rc3`       | v1          | labring/kubernetes:v1.26.0 |
| `>=1.27`           | `>=v4.2.0-alpha3`    | v1          | labring/kubernetes:v1.27.0 |

These images use containerd as the container runtime interface (CRI). containerd is a lightweight, high-performance container runtime that is compatible with Docker. Using containerd-based Kubernetes images can provide better performance and resource utilization.

Depending on the Kubernetes version, you can choose different Sealos versions and CRI versions. For example, if you want to use Kubernetes v1.26.0, you can choose Sealos v4.1.4-rc3 or higher and use CRI v1.

#### Kubernetes with Docker (Kubernetes version >=1.18.0)

| Kubernetes Version | Sealos Version       | CRI Version | Image Version                          |
| ------------------ | -------------------- | ----------- | -------------------------------------- |
| `<1.25`            | `>=v4.0.0`           | v1alpha2    | labring/kubernetes-docker:v1.24.0 |
| `>=1.25`           | `>=v4.1.0`           | v1alpha2    | labring/kubernetes-docker:v1.25.0 |
| `>=1.26`           | `>=v4.1.4-rc3`       | v1          | labring/kubernetes-docker:v1.26.0 |
| `>=1.27`           | `>=v4.2.0-alpha3`    | v1          | labring/kubernetes-docker:v1.27.0 |

These images use Docker as the container runtime interface (CRI). Docker is a widely used and feature-rich container platform that provides an easy-to-use interface and a rich ecosystem. Using Docker-based Kubernetes images allows for easy integration with existing Docker infrastructure.

Similar to containerd-based Kubernetes images, you can choose different Sealos versions and CRI versions based on the Kubernetes version. For

example, if you want to use Kubernetes v1.26.0, you can choose Sealos v4.1.4-rc3 or higher and use CRI v1.

## Summary

We provide multiple options for running containers in your Kubernetes cluster. You can choose from different image types and versions based on your needs and preferences. Also, don't forget to check the [changelog](https://github.com/labring/sealos/blob/main/CHANGELOG/CHANGELOG.md) for any updates or additional information.
