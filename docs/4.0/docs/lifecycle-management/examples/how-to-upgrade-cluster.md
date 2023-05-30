# how to upgrade cluster

Just run the command '**sealos run labring/kubernetes:\<new-version\>**'.

**Make sure that you have built the cluster before.**

## For examples

1. You have run the command :

```sh
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.8 --nodes 192.168.64.7
```

2. To upgrade cluster to v1.25.0 :

```sh
sealos run labring/kubernetes:v1.25.0 
```

​	And when it comes to 'kubeadm upgrade v1.25.0', you will see :

```txt
[upgrade/version] You have chosen to change the cluster version to "v1.25.0"
[upgrade/versions] Cluster version: v1.24.0
[upgrade/versions] kubeadm version: v1.25.0
[upgrade] Are you sure you want to proceed? [y/N]: 
```

​	Input 'y' so that cluster upgrade goes on. 

​	If **error happen**s, you can run the command 'sealos run labring/kubernetes:v1.25.0' again. It assure the same result after failure. 

## Usage

1. **Upgrade cannot skip minor version**. Like 'v1.23.0 to v1.25.0' that is not allowed. If really need to upgrade from v1.23.0 to v1.25.0, you can split to two steps like 'v1.23.0 to v1.24.0' and 'v1.24.0 to v1.25.0'.

2. Upgrade once succeed the cluster mount image of old version was replaced. Add masters or nodes will apply the new version.

​	