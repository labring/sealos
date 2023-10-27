---
sidebar_position: 2
---

# Building Cluster Images Based on Deployment Manifest

This document will detail how to build cluster images based on Deployment Manifests. We will use a simple nginx application as an example.

## I. Preparations

1. First, create a base directory as the build workspace.

```shell
$ mkdir ~/cloud-images
```

2. Create a directory named `manifests` to store the kubernetes nginx deployment yaml file.

```shell
$ cd cloud-images
$ mkdir manifests
```

## II. Prepare the Manifest File

At this stage, we will prepare a simple nginx kubernetes yaml file.

```shell
$ cat manifests/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 2
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.23.1
        ports:
        - containerPort: 80
```

## III. Create Kubefile

At this stage, we need to create a Kubefile that will be used to build the image.

```shell
FROM scratch
COPY manifests manifests
COPY registry registry
CMD ["kubectl apply -f manifests/deployment.yaml"]
```

## IV. Build the Cluster Image

After preparing all the necessary files and directories, we can start building the cluster image.

```shell
sealos build -t labring/nginx:v1.23.1 .
```

**Note:** Before starting the build, you need to install the sealos command on your local host.

During the build, you can view the build log.

## V. Verify the Image

After the build is complete, you can view the built image with the following command:

```shell
root@ubuntu:~/cloud-images# sealos images
labring/nginx                      v1.23.1          521c85942ee4   4 minutes ago   56.8 MB
```

## VI. Push the Image

Finally, we can push the built image to any Docker image repository. The following command pushes it to DockerHub.

```shell
sealos push labring/nginx:v1.23.1
```

**Note:** Please use the sealos command to operate the cluster image, the Docker command is not supported.

If you are using a private image repository, just use `sealos login` to log into the repository before pulling or pushing the image.

```shell
sealos login docker.io -u xxx -p xxx

sealos login registry.cn-hangzhou.aliyuncs.com -u xxx -p xxx
```

At this point, the cluster image based on the deployment manifest is successfully built.
