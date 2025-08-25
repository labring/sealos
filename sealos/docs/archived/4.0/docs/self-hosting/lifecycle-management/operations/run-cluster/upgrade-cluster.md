---
sidebar_position: 3
---

# How to Upgrade the Cluster

If you want to upgrade your Kubernetes cluster, you just need to run the following command:

```sh
sealos run labring/kubernetes:<new_version>
```

Make sure you have already set up the cluster.

## Example Scenario

1. Let's say you have previously run the following command:

```sh
sealos run labring/kubernetes:v1.24.0 labring/calico:v3.22.1 --masters 192.168.64.8 --nodes 192.168.64.7
```

2. Now, if you want to upgrade the cluster to v1.25.0, you can do the following:

```sh
sealos run labring/kubernetes:v1.25.0
```

During the execution of 'kubeadm upgrade v1.25.0', you will see:

```txt
[upgrade/version] You have chosen to change the cluster version to "v1.25.0"
[upgrade/versions] Cluster version: v1.24.0
[upgrade/versions] kubeadm version: v1.25.0
[upgrade] Are you sure you want to proceed? [y/N]: 
```

Type 'y' to proceed with the upgrade.

If there are any **errors**, you can rerun the command 'sealos run labring/kubernetes:v1.25.0'. Even if it fails, it will ensure the same result.

## Important Notes

1. **Upgrades cannot skip minor version numbers**. For example, upgrading from 'v1.23.0' to 'v1.25.0' is not allowed. If you do need to upgrade from 'v1.23.0' to 'v1.25.0', you can do it in two steps, such as upgrading from 'v1.23.0' to 'v1.24.0' first, and then from 'v1.24.0' to 'v1.25.0'.

2. Once the upgrade is successful, the old version images mounted by the cluster will be replaced. Adding master or worker nodes will apply the new version.

This is the entire process of upgrading a Kubernetes cluster. If you encounter any issues during the upgrade process, don't hesitate to refer to relevant documentation or seek assistance.
