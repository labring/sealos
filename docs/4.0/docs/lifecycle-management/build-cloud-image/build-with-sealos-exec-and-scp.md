# build with sealos exec and scp

By default, The `sealos run xx` only run comand and copy file in first master node,  when you want run command or copy file in special nodes or all nodes,  you can use `sealos exec` or `sealos scp` commands in cloud images.

- sealos exec:  connect one or more nodes and run any shell command;
- sealos scp: connect to one or more nodes and cp local file to remote nodes. 

You can use these commands directly on the host, but this example mainly describes how to use these two commands when building cloud image with sealos build.

## sealos exec example

The following is an example of building an openebs cloud image, Before installing openebs maystor, you need to perform some initialization operations on the node, You will use sealos exec do this.

Create a base directory for build work.

```shell
$ mkdir ~/cloud-images
```

Create a `charts` directory to store kubernetes nginx helm charts file.

```shell
$ cd cloud-images
```

Create a file named `Kubefile` for image build:

```shell
$ cat Kubefile
FROM scratch
COPY manifests manifests
COPY registry registry
COPY opt opt
COPY mayastor.sh mayastor.sh
CMD ["bash mayastor.sh"]
```

Create a scripts file named `mayastor.sh`, the shell command following sealos exec will be executed on all nodes(It create hugepage、modprobe kernel modules on all nodes), but other commands just run on master nodes.

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

Now the charts directory as follow.

```shell
.
├── Kubefile
├── manifests
├── mayastor.sh
└── opt
```

Now everything is ready, you can start to build the cloud image.

```shell
sealos build -t labring/openebs-mayastor:v1.0.4 .
```

When you run the cloud image, sealos will run mayastor.sh scripts  on master nodes ,but the sealos exec shell commands will run on all nodes, Finally, sealos will install openebs maystor storage on the master node.

```
sealos run labring/openebs-mayastor:v1.0.4
```

## sealos scp example

The following example copies the bin file to all nodes.

Create a file named `Kubefile` for image build:

```shell
FROM scratch
COPY manifests manifests
COPY registry registry
COPY opt opt
CMD ["sealos scp opt/ /opt/cni/bin/","kubectl apply -f manifests/kube-flannel.yml"]
```

The opt file like this:

```
$ ls opt/
bandwidth  bridge  dhcp  firewall  host-device  host-local  ipvlan  loopback  macvlan  portmap  ptp  sbr  static  tuning  vlan  vrf
```

Now everything is ready, you can start to build the cloud image.

```shell
sealos build -t labring/flannel:v0.19.0 .
```

When you run the cloud image, sealos will copy opt bin file to all nodes ,then install flannel on master nodes.

```
sealos run labring/flannel:v0.19.0
```

