---
sidebar_position: 1
---

# Frequently Asked Questions

When using Sealos, you may encounter some common questions and issues. Here are answers and solutions to some of the common problems.

## Image Building Issues

### Q1: How to set up a proxy service during the build phase?

During the execution of the build command, you can configure a proxy service by setting the HTTP_PROXY environment variable.

```shell
HTTP_PROXY=socket5://127.0.0.1:7890 sealos build xxxxx
```

### Q2: How to enable debug logs for buildah?

To view debug logs for buildah, you can set the `BUILDAH_LOG_LEVEL` environment variable.

```shell
BUILDAH_LOG_LEVEL=debug sealos images
```

### Q3: How to execute Sealos build within a Pod?

If you want to execute Sealos build within a Pod, follow these steps:

1. Build the image within the Pod. You can create a Deployment with the following YAML configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: sealoscli
  name: sealoscli
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sealoscli
  strategy: {}
  template:
    metadata:
      labels:
        app: sealoscli
    spec:
      containers:
        - image: # Replace with your sealos image
          name: sealoscli
          stdin: true
          stdinOnce: true
          securityContext:
            privileged: true
```

2. Create a Dockerfile. Here's an example that you can modify as per your needs:

```dockerfile
FROM bitnami/minideb:buster

ARG TARGETOS
ARG TARGETARCH

LABEL from=bitnami/minideb:buster platform=rootcloud team=oam tag=buster name=base

RUN sed -i "s@http://deb.debian.org@http://mirrors.aliyun.com@g" /etc/apt/sources.list && sed -i "s@http://security.debian.org@http://mirrors.aliyun.com/debian-security@g" /etc/apt/sources.list
RUN install_packages curl iputils-ping net-tools telnet procps vim wget jq

ENV LANG=C.UTF-8
ENV LANGUAGE=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV TZ=Asia/Shanghai
```

3. Execute the build command within the Pod.

```shell
sealos build --arch arm64 --build-arg TARGETOS=linux --build-arg TARGETARCH=arm64 -t test  -f Dockerfile .
```

### Q4: How to Build Cluster Images Using Other Build Tools?

If you want to use other container tools like Docker or Podman to build cluster images, you can utilize [sreg](https://github.com/labring/sreg) to cache the images.

Follow these steps:

1. Install sreg:
   ```shell
   wget https://github.com/labring/sreg/releases/download/v0.1.1/sreg_0.1.1_linux_amd64.tar.gz
   tar -xzf sreg_0.1.1_linux_amd64.tar.gz sreg
   mv sreg /usr/bin/
   ```
2. Cache the images:
   ```shell
   sreg save --registry-dir=registry .
   ```
3. Build the cluster image:
   ```shell
   docker build -t xxxx -f Sealfile .
   ```

### Q5: Encounter the error "lgetxattr /var/lib/containers/storage/overlay/0c2afe770ec7870ad4639f18a1b50b3a84718f95c8907f3d54e14dbf0a01d50d/merged/dev/ptmx: no such device" during Sealos build. How to fix it?

This issue might be related to the version of `fuse-overlayfs`. We recommend downloading the latest version from [here](https://github.com/containers/fuse-overlayfs/releases) and replacing `/bin/fuse-overlayfs`.

## Runtime Selection Issues

### Q1: How to select the Kubernetes runtime?

Sealos determines the runtime based on the image you choose. If you select the `kubernetes-docker` image, Sealos will use Docker as the runtime. If you choose the `kubernetes-crio` image, Sealos will use CRI-O as the runtime.

## Version Compatibility Issues

### Q1: Error "Applied to cluster error: failed to

init exec auth.sh failed exit status 127"?

This error is often caused by a mismatch between the version of Sealos and the version of the image being used. Make sure that the image version and the Sealos version are compatible. For example, if you are using a Kubernetes version like `v1.xx.x`, you may need to upgrade Sealos, especially if you are using an older version of Sealos while the Sealos cluster image is using the latest version. Another solution is to choose the corresponding version of the Sealos image. For example, if your Sealos version is 4.1.3, then the cluster image should be something like `kubernetes:v1.24.0-4.1.3`. Ensuring that the image version and Sealos version are compatible can help avoid such issues.

### Q2: Error when adding additional domains or modifying the service CIDR in the cluster during the addition of a master node

To address this issue, the Sealos team made the necessary fixes in version 4.2.0. You can refer to the specific fix and discussion in this pull request: [https://github.com/labring/sealos/pull/2943](https://github.com/labring/sealos/pull/2943).

Therefore, if you encounter this problem, we recommend upgrading to Sealos version 4.2.0. The updated version should handle these changes correctly and not produce errors when adding a master node.

## File and Directory Location Issues

### Q1: How to modify the default storage location for `/root/.sealos`?

If you need to change the default storage location, you can set the `SEALOS_RUNTIME_ROOT` environment variable and then run the Sealos command. It is recommended to set this environment variable globally so that it can be conveniently used in other commands or scenarios.

```shell
export SEALOS_RUNTIME_ROOT=/data/.sealos 
sealos run labring/kubernetes:v1.24.0
```

### Q2: How to modify the default storage location for `/var/lib/sealos`?

If you need to change the default storage location, you can set the `SEALOS_DATA_ROOT` environment variable and then run the Sealos command. Similarly, it is recommended to set this environment variable globally.

```shell
export SEALOS_DATA_ROOT=/data/sealos 
sealos run labring/kubernetes:v1.24.0
```

### Q3: How to modify the storage paths for Sealos image data and status?

> When using the Sealos cluster, you may need to change the default storage paths for image data and status data. By default, these data are stored at the locations defined in the `/etc/containers/storage.conf` file.

1. **View the current storage configuration**
   First, you can use the following command to view the current image storage configuration:
   ```
   sealos images --debug
   ```
   This command will print the file that contains the current storage configuration, for example:
   ```
   2023-06-07T16:27:02 debug using file /etc/containers/storage.conf as container storage config
   REPOSITORY   TAG   IMAGE ID   CREATED   SIZE
   ```
2. **Modify the storage path for image data**
   If you want to change the storage path for image data, you can edit the `/etc/containers/storage.conf` file. In this file, find and modify the `graphroot` field to set it to the new path. For example:
   ```
   vim /etc/containers/storage.conf
   ```
   In the editor, modify the value of the `graphroot` field to the desired new path.
3. **Modify the storage

path for status data**
Similar to the design of Buildah, Sealos also provides the ability to set the storage path for status data. In the same configuration file `/etc/containers/storage.conf`, find and modify the `runroot` field to the new path.

By following these steps, you can save the image data and status data of the Sealos cluster to the new paths you set. Each time you run a Sealos command, it will use the new paths you set in `graphroot` and `runroot` to store the image data and status data, respectively.

### Q4: How to disable file md5 check during SSH file transfer?

When the network environment is good, disabling the md5 check can greatly improve transfer speed. If you don't want to check the md5 of files during SSH file transfer, you can add the `-o "HashKnownHosts no"` option to the SSH command.

```shell
scp -o "HashKnownHosts no" local_file remote_user@remote_ip:/path/to/destination
```

This option tells SSH not to hash the hostnames in the known_hosts file, which avoids the md5 check during file transfer.
