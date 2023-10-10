---
sidebar_position: 4
---

# Building Cluster Images Based on Binary Files

This document primarily details how to use the `sealos` tool to package a single binary file (like `helm` or `kustomize`) into a cluster image and install them by deploying the cluster image on the master node. Using `helm` as an example, we will thoroughly discuss how to package a binary file into a cluster image.

## Create a Build Workspace

Firstly, create a base directory to serve as a build workspace:

```shell
$ mkdir ~/cluster-images
```

In the workspace, create an `opt` directory for storing the binary files:

```shell
$ cd cluster-images
$ mkdir opt/
```

## Prepare the Binary File

Next, we prepare the `helm` binary file. Here, we download from [github release](https://github.com/helm/helm/releases):

```shell
wget https://get.helm.sh/helm-v3.10.1-linux-amd64.tar.gz
tar -zxvf helm-v3.10.1-linux-amd64.tar.gz
chmod a+x linux-amd64/helm
mv linux-amd64/helm opt/
```

## Create the `Sealfile` Required for Building the Image

Create a file named `Sealfile`, with the following content:

```shell
FROM scratch
COPY opt ./opt
CMD ["cp opt/helm /usr/bin/"]
```

The current directory structure is as follows:

```
.
├── Sealfile
└── opt
    └── helm
```

## Build the Cluster Image

Now, everything is ready, and you can begin building the cluster image:

```shell
sealos build -t labring/helm:v3.10.1 .
```

**Note:** Firstly, you need to install the `sealos` command on the local host.

You can view the build log to understand the building process.

```shell
root@ubuntu:~/cluster-images# sealos build -t labring/helm:v3.10.1 .
...
```

View the built image, and now all the dependent binary files have been built into the cluster image:

```shell
root@ubuntu:~/cluster-images# sealos images
labring/helm                      v3.10.1          19ed4a24f0fe   3 minutes ago       45.1 MB
```

## Push the Image

You can push the image to any Docker image repository, the following command pushes the image to DockerHub:

```shell
sealos push labring/helm:v3.10.1
```

**Note:** Please use the `sealos` command to operate the cluster image; Docker commands are not supported.

If you are using a private image repository, you can use the `sealos login` command to log into your image repository, then push or pull the image.
