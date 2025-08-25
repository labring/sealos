---
sidebar_position: 0
---

# Building Multi-Architecture Cluster Images

This article will explain how to use the `sealos` tool to build cluster images that support multiple architectures (such as amd64 and arm64) and push them to a container image repository.

## Step-by-step Instructions

### Building the Images

Firstly, we need to build images for both amd64 and arm64 architectures. Using the `sealos build` command, specify the image tag (including the prefix and version), platform (with the `--platform` parameter), Dockerfile (with the `-f` parameter), and context path:

```shell
$ sealos build -t $prefix/oci-kubernetes:$version-amd64 --platform linux/amd64   -f Kubefile  .
$ sealos build -t $prefix/oci-kubernetes:$version-arm64 --platform linux/arm64   -f Kubefile  .
```

Here, `$prefix` represents your image repository address and namespace, and `$version` is your image version.

### Logging into the Container Image Repository

Next, we need to log in to the container image repository so we can push the images later. Use the `sealos login` command, specify the username, password, and repository domain:

```shell
$ sealos login --username $username --password $password $domain
```

### Pushing the Images

Then, we will push the two images we built to the container image repository. Using the `sealos push` command, specify the image tag:

```shell
$ sealos push $prefix/oci-kubernetes:$version-amd64
$ sealos push $prefix/oci-kubernetes:$version-arm64
```

### Creating and Pushing the Image Manifest

Finally, we need to create a manifest that includes these two images and push it to the container image repository. This manifest allows Docker or Kubernetes to automatically select an image that matches the runtime architecture when pulling the image:

```shell
$ sealos manifest create $prefix/oci-kubernetes:$version
$ sealos manifest add $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version-amd64
$ sealos manifest add $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version-arm64
$ sealos manifest push --all $prefix/oci-kubernetes:$version docker://$prefix/oci-kubernetes:$version
```

With that, the multi-architecture cluster image has been built. In practice, you need to replace `$prefix` and `$version` in the commands above according to your container image repository address and namespace, and image version.
