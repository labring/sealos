---
sidebar_position: 2
---

# CRI Container Management

The `cri` command is used to manage and inspect the Container Runtime Interface (CRI) environment in a Kubernetes cluster. The container runtime is the underlying technology responsible for running containers, such as Docker, containerd, or CRI-O. In Kubernetes, the container runtime is used to start, stop, and manage containers to support workloads in the cluster.

The `sealctl cri` command provides a set of subcommands that allow you to perform various operations related to the container runtime, such as checking if the runtime is Docker, if it is running, listing Kubernetes containers, deleting containers, pulling images, checking image existence, and retrieving CGroup driver information.

By using the `sealctl cri` command, you can easily manage and inspect the container runtime environment in your Kubernetes cluster to ensure proper configuration and smooth operation.


```shell
sealctl cri [flags]
```


Subcommands:

1. `socket`: Check the CRI socket.

```shell
sealctl cri socket
```

2. `cgroup-driver`: Get the cgroup driver of the container runtime.

```shell
sealctl cri cgroup-driver [--short]
```

- `--short`: Print only the result.

Global flags:

- `--socket-path`: Path to the CRI socket.
- `--config`: Path to the CRI configuration file.

Examples:

```shell
sealctl cri socket
sealctl cri cgroup-driver --short
```
