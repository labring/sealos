---
sidebar_position: 6
---

# Building Cluster Images Using exec and scp Commands

By default, `sealos run xx` only runs the command and copies the file on the first master node. When you want to run the command or copy files on specific nodes or all nodes, you can use the `sealos exec` or `sealos scp` commands when building the cluster image.

- sealos exec: Connects to one or more nodes and runs any shell command;
- sealos scp: Connects to one or more nodes and copies local files to remote nodes.

Although you can directly use these commands on the host, this article mainly describes how to use these two commands when building the cluster image using sealos build.

## sealos exec Example

Below is an example of building an openebs cluster image. Before installing openebs maystor, some initialization operations need to be performed on the node, you can use sealos exec to achieve this.

First, create a base directory for building.

```shell
$ mkdir ~/cloud-images
```

Create a `charts` directory to store the kubernetes nginx helm charts file.

```shell
$ cd cloud-images
```

Create a file named `Kubefile` for image building:

```shell
$ cat Kubefile
FROM scratch
COPY manifests manifests
COPY registry registry
COPY opt opt
COPY mayastor.sh mayastor.sh
CMD ["bash mayastor.sh"]
```

Create a script file named `mayastor.sh`, the shell command after sealos exec will be executed on all nodes (create hugepage, load kernel modules on all nodes), but other commands will only run on the master node.

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

Now, the charts directory is as follows:

```shell
.
├── Kubefile
├── manifests
├── mayastor.sh
└── opt
```

Now everything is ready, you can start building the cluster image.

```shell
sealos build -t labring/openebs-mayastor:v1.0.4 .
```

When you run the cluster image, sealos will run the mayastor.sh script on the master node, but the shell command of sealos exec will run on all nodes. Finally, sealos will install openebs maystor storage on the master node.

```
sealos run labring/openebs-mayastor:v1.0.4
```

## sealos scp Example

The following example copies the bin file to all nodes.

Create a file named `Kubefile` for image building:

```shell
FROM scratch
COPY manifests manifests
COPY registry registry
COPY opt opt
CMD ["seal

os scp opt/ /opt/cni/bin/","kubectl apply -f manifests/kube-flannel.yml"]
```

The opt file is as follows:

```
$ ls opt/
bandwidth  bridge  dhcp  firewall  host-device  host-local  ipvlan  loopback  macvlan  portmap  ptp  sbr  static  tuning  vlan  vrf
```

Now everything is ready, you can start building the cluster image.

```shell
sealos build -t labring/flannel:v0.19.0 .
```

When you run the cluster image, sealos will copy the opt bin file to all nodes, then install flannel on the master node.

```
sealos run labring/flannel:v0.19.0
```
