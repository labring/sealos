# sealos Cloud Provider

Sealos Cloud Provider (SCP)
allows users to easily launch a custom kubernetes cluster on all major public cloud platforms.
It currently supports AWS, and will support Ali Cloud, Tencent Cloud, Huawei Cloud, GCP, Azure, and Baremetal in the future.

## Product Advantages

* **High Speed**, build custom kubernetes clusters on the cloud in minutes
* **Flexible Configuration**, freely scalable clusters by editing configuration files
* **Low Cost**, 10% cheaper than starting a cloud server directly
* **Easy to Use**, it is as simple as installing and using an application on a PC
* **Compatibility**, API is fully compatible with kubernetes CRD design, supports remote calls, and supports docking to any other system, such as CI/CD systems to automatically create/destroy clusters
* **Customized**, support for custom clusters, with the ability to freely choose which version of kubernetes to install and the upper addon through cluster image capabilities, and support for all cluster images in existing sealos repositories
* **Cross-platform**, free to switch between cloud vendors, multiple cloud vendors' resources can be uniformly managed

## How to Use

### Use SCP by UI

Log in to [sealos cloud](https://cloud.sealos.io), click the sealos cloud provider icon on the desktop, and enter the Create Cluster interface.

![img.png](img.png)

You can start a kubernetes cluster in minutes by specifying the node type, number of nodes, disk capacity, disk type, and other configurations in this interface. You can customize the components you want to run in the cluster, such as calico dashboard mysql or even sealos cloud.

![img_1.png](img_1.png)

On this page, you can view cluster id, creation time, ssh key, as well as intranet and public IP and operation status of each node. It is also supported to modify the cluster and release the cluster with one click, so that you can easily manage the cluster life cycle.

![img_2.png](img_2.png)

Once the cluster is running successfully, you can access the cluster through the public IP of the master node and ssh key.

Copy the ssh private key and save it to the .ssh/cloud.key file, then
```shell
chmod 0400 .ssh/cloud.key  #Change key file permissions
ssh -i ~/.ssh/cloud.key root@master-ip  #Log in the master node as the user root
# Access the cluster after successful login
kubectl get pod -A
```

### Use SCP by Cloud Terminal

Create infra on sealos cloud using cloud terminal

![img_3.png](img_3.png)

Create a yaml file containing infra and cluster, which can freely define the cluster specifications and configuration. infra will help you start virtual machines on the public cloud, while cluster will install a kubernetes cluster running the specified cluster images on those virtual machines.

test.yaml:
```yaml
apiVersion: infra.sealos.io/v1
kind: Infra
metadata:
  name: infra-apply-test
spec:
  hosts:
  - roles: [master] # Required
    count: 1 # Required
    flavor: "t2.large"
    image: "ami-0d66b970b9f16f1f5" 
  - roles: [ node ] # Required
    count: 1 # Required
    flavor: "t2.medium"
    image: "ami-0d66b970b9f16f1f5"
---
apiVersion: cluster.sealos.io/v1
kind: Cluster
metadata:
  name: infra-apply-test
  annotations:
    sealos.io/version: "4.1.4" 
spec:
  infra: infra-apply-test
  images:
    - labring/kubernetes:v1.24.0
    - labring/calico:v3.22.1
```

Execute directly on cloud terminal
```shell
kubectl apply -f test.yaml
```

Get the cluster access information, which contains the public address of each server and the ssh access key information
```shell
kubectl get infra infra-apply-test  -oyaml
```

Automatic cluster scaling by editing infra files to add and remove nodes to the cluster
```shell
kubectl edit infra infra-apply-test
```

As with the UI, you can get the ssh private key from the cluster information returned by infra, access the master0 node of the cluster, and then use all the kubectl commands.


### Use SCP locally

Prerequisite: kubectl is already installed locally.

Download the user-specific kubeconfig file from the sealos cloud:

![img_4.png](img_4.png)

Copy this file as .kube/config, e.g. `cp kubeconfig.yaml .kube/config`

This license file is exclusive to the user and can be used to access all APIs from anywhere, not just to access and use the sealos cloud provider.

After the configuration is complete, other steps are the same as above.

```shell
kubectl get pod
kubectl get infra
kubectl get cluster
kubectl apply -f infra.yaml
```

## API reference

Infra CRD is only responsible for starting virtual machines
```shell
apiVersion: infra.sealos.io/v1
kind: Infra
metadata:
  name: test-infra
spec:
  hosts:
    - roles: [ master ]
      count: 1
      flavor: t2.large # Virtual machine flavor
      image: "ami-0d66b970b9f16f1f5" # Virtual machine image， need to be consistent with the virtual machine architecture
      disks:
        - capacity: 40 # System disk size
          volumeType: gp3
          type: "root" # System disk configuration
        - capacity: 40
          volumeType: standard
          type: "data" # Data disk configuration
    - roles: [ node ]
      count: 1
      flavor: t2.medium
      image: "ami-0d66b970b9f16f1f5"
      disks:
        - capacity: 40
          volumeType: gp3
          type: "root"
        - capacity: 40
          volumeType: gp3
          type: "data"
```

Cluster CRD, if defined, starts a kubernetes cluster on the Infra it specifies

```shell
apiVersion: cluster.sealos.io/v1
kind: Cluster
metadata:
  name: test-cluster
  annotations:
    sealos.io/version: "4.1.4" # Specify the version of sealos to use
spec:
  infra: my-cluster # Specifying the name of the infra will start the kubernetes cluster on the corresponding infra
  image: # List of cluster images, customize kubernetes version or other components
  - labring/kubernetes:v1.24.0
  - labring/calico:v3.22.1
```