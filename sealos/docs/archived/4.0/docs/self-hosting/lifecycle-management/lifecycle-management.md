---
sidebar_position: 0
---

# Kubernetes Lifecycle Management

Sealos provides a powerful set of tools that allow users to easily manage the entire lifecycle of a cluster.

## Features

With Sealos, you can install a bare Kubernetes cluster without any components. Additionally, Sealos can assemble various upper-layer distributed applications on top of Kubernetes using cluster image capabilities, such as databases, message queues, and more.

Sealos not only allows you to install a single-node Kubernetes development environment but also enables you to build production-grade highly available clusters with thousands of nodes.

Sealos offers features like cluster scaling, backup and recovery, and cluster release. It provides an excellent Kubernetes runtime experience even in offline environments.

## Key Features

- ARM support. Offline packages v1.20 and above support integration with both containerd and Docker.
- Provides 99-year certificates and supports cluster backup and upgrade.
- Does not rely on Ansible, HAProxy, or Keepalived. It is a standalone binary tool with zero dependencies.
- Provides offline installation. Different versions of Kubernetes only require different cluster images.
- High availability is achieved through localLB based on IPVS, which consumes fewer resources and provides stability and reliability, similar to kube-proxy implementation.
- Automatically recognizes image names using image-cri-shim, making offline delivery more convenient.
- Almost compatible with all x86_64 architectures that support systemd.
- Easy addition/deletion of cluster nodes.
- Trusted by tens of thousands of users in production environments, stable and reliable.
- Supports cluster images, allowing you to customize and combine the cluster components you need, such as OpenEBS storage + database + MinIO object storage.
- Uses the SDK of Buildah to standardize the image format, fully compatible with OCI standards.

## Running a Kubernetes Cluster with Sealos

Running a Kubernetes cluster with Sealos is straightforward. Just follow these steps:

```bash
$ curl -sfL  https://raw.githubusercontent.com/labring/sealos/v4.3.0/scripts/install.sh \
    | sh -s v4.3.0 labring/sealos
# Create a cluster
$ sealos run labring/kubernetes:v1.25.0-4.2.0 labring/helm:v3.8.2 labring/calico:v3.24.1 \
     --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
     --nodes 192.168.64.21,192.168.64.19 -p [your-ssh-passwd]
```

[![asciicast](https://asciinema.org/a/519263.svg)](https://asciinema.org/a/519263?speed=3)

## Running Distributed Applications on the Cluster

With the `sealos run` command, you can run various distributed applications on the cluster, such as databases, message queues, AI capabilities, and even enterprise-level SaaS software. For example:

```shell
# MySQL cluster
$ sealos run labring/mysql-operator:8.0.23-14.1

# Clickhouse cluster
$ sealos run labring/clickhouse:0.18.4

# Redis cluster
$ sealos run labring/redis-operator:3.1.4
```

## Customizing the Cluster

For cluster images not available in the Sealos ecosystem, users can easily build and customize their own cluster images. For example:

[Building an Ingress Cluster Image](/self-hosting/lifecycle-management/quick-start/build-ingress-cluster-image.md)

You can also customize your own Kubernetes cluster:

Sealfile:

```shell
FROM kubernetes:v1.25.0
COPY flannel-chart .
COPY mysql-chart .
CMD ["helm install flannel flannel-chart", "helm install mysql mysql-chart"]
```

```shell
sealos build -t my-kubernetes:v1.25.0 .
sealos run my-kubernetes:v1.25.0 ...
```

## Frequently Asked Questions

**Is Sealos a Kubernetes installation tool?**

Installation and deployment are basic functions of Sealos, similar to the boot module in a single-node operating system. Sealos' boot module effectively manages the lifecycle of Kubernetes in any scenario.

**What are the differences between Sealos, Rancher, and KubeSphere?**

Sealos is designed with the philosophy of "simplifying complexity, freely assembling, and simplicity as the ultimate goal." Sealos leverages the capabilities of Kubernetes to provide users with exactly what they need in a simple way. Users may not necessarily need Kubernetes; what they need is specific functionality.

Sealos is highly flexible and does not impose additional burdens on users. Its form depends on user requirements and the applications being installed. The core of Sealos is distributed applications, and all applications are treated equally.
