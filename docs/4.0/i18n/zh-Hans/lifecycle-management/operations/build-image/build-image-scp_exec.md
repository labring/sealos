---
sidebar_position: 6
---

# 使用 exec 和 scp 命令构建集群镜像

默认情况下，`sealos run xx` 只会在第一个主节点上运行命令和复制文件。当你希望在特定节点或所有节点上运行命令或复制文件时，你可以在构建集群镜像时使用 `sealos exec` 或 `sealos scp` 命令。

- sealos exec: 连接到一个或多个节点并运行任何 shell 命令；
- sealos scp: 连接到一个或多个节点并将本地文件复制到远程节点。

虽然你可以直接在宿主机上使用这些命令，但本文主要描述的是在使用 sealos build 构建集群镜像时如何使用这两个命令。

## sealos exec 示例

以下是构建一个 openebs 集群镜像的示例。在安装 openebs maystor 之前，需要在节点上执行一些初始化操作，你可以使用 sealos exec 来实现这一点。

首先，创建一个用于构建工作的基础目录。

```shell
$ mkdir ~/cloud-images
```

创建一个 `charts` 目录，用来存储 kubernetes nginx helm charts 文件。

```shell
$ cd cloud-images
```

创建一个名为 `Kubefile` 的文件，用于镜像构建：

```shell
$ cat Kubefile
FROM scratch
COPY manifests manifests
COPY registry registry
COPY opt opt
COPY mayastor.sh mayastor.sh
CMD ["bash mayastor.sh"]
```

创建一个名为 `mayastor.sh` 的脚本文件，sealos exec 后面的 shell 命令将在所有节点上执行（在所有节点上创建 hugepage、加载内核模块），但其他命令只会在主节点上运行。

```shell
$ cat mayastor.sh
#!/usr/bin/env bash
set -e

sealos exec "
echo vm.nr_hugepages = 1024 | sudo tee -a /etc/sysctl.d/mayastor.conf 
sysctl -p
sudo modprobe -- nbd
sudo modprobe -- nvmet
sudo modprobe -- nvmet_rdma
sudo modprobe -- nvme_fabrics
sudo modprobe -- nvme_tcp
sudo modprobe -- nvme_rdma
sudo modprobe -- nvme_loop
cat <<EOF | sudo tee /etc/modules-load.d/mayastor.conf
nbd
nvmet
nvmet_rdma
nvme_fabrics
nvme_tcp
nvme_rdma
nvme_loop
EOF"

cp opt/kubectl-mayastor /usr/local/bin
kubectl label node --overwrite --all openebs.io/engine=mayastor
kubectl apply -k ./manifests/mayastor/
```

现在，charts 目录如下：

```shell
.
├── Kubefile
├── manifests
├── mayastor.sh
└── opt
```

现在一切都准备好了，你可以开始构建集群镜像。

```shell
sealos build -t labring/openebs-mayastor:v1.0.4 .
```

当你运行集群镜像时，sealos 将在主节点上运行 mayastor.sh 脚本，但 sealos exec 的 shell 命令将在所有节点上运行，最后，sealos 将在主节点上安装 openebs maystor 存储。

```
sealos run labring/openebs-mayastor:v1.0.4
```

## sealos scp 示例

下面的示例将 bin 文件复制到所有节点。

创建一个名为 `Kubefile` 的文件，用于镜像构建：

```shell
FROM scratch
COPY manifests manifests
COPY registry registry
COPY opt opt
CMD ["sealos scp opt/ /opt/cni/bin/","kubectl apply -f manifests/kube-flannel.yml"]
```

opt 文件如下：

```
$ ls opt/
bandwidth  bridge  dhcp  firewall  host-device  host-local  ipvlan  loopback  macvlan  portmap  ptp  sbr  static  tuning  vlan  vrf
```

现在一切都准备好了，你可以开始构建集群镜像。

```shell
sealos build -t labring/flannel:v0.19.0 .
```

当你运行集群镜像时，sealos 将会将 opt bin 文件复制到所有节点，然后在主节点上安装 flannel。

```
sealos run labring/flannel:v0.19.0
```
