---
sidebar_position: 2
---

# Offline environment installation

The offline environment only needs to import the image in advance, 
and other steps are the same as the online installation. 
First save the installation package in a networked environment：

```shell
$ sealos pull labring/kubernetes:v1.25.0
$ sealos save -o kubernetes.tar labring/kubernetes:v1.25.0
```

Copy kubernetes.tar to the offline environment, and use the load command to import the image:

```shell
$ sealos load -i kubernetes.tar
```

The rest of the installation method is the same as the online installation.
```shell
$ sealos images # Check whether the cluster image is imported successfully
$ sealos run kuberentes:v1.25.0 --single # Single machine installation, cluster installation is the same
```
