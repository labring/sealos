---
sidebar_position: 6
---

# Create Working Directory

`sealos create` is a command in the Sealos command line tool, mainly used for creating the cluster working directory without executing the CMD, so as to review the image. This guide will detail its usage and options.

## Basic Usage

The `sealos create` command is used to create a cluster working directory but does not actually run, mainly used for debugging or testing. It can output the address of the cluster image, you can check whether the content of the cluster image is consistent with the expectation.

```bash
sealos create docker.io/labring/kubernetes:v1.24.0
```

In the above command, `clustername` represents the name of the cluster you want to create.

## Options

The `sealos create` command provides the following options:

- `-c, --cluster='default'`: The name of the cluster to be created but not actually run. The default is `default`.

- `--platform='linux/arm64/v8'`: Set the operating system/architecture/version of the image to the provided value, rather than the current operating system and architecture of the host (for example, `linux/arm`).

- `--short=false`: If true, only print the mount path.

- `-e, --env=[]`: Specify environment variables used during the rendering of template files.

Each option can be followed by an argument.

## Example

For example, you can use the following command to create a cluster named `mycluster`, but do not actually run it:

```bash
sealos create -e registryPort=8443 docker.io/labring/kubernetes:v1.24.0
```

This command will create a cluster working directory with an image name of `docker.io/labring/kubernetes:v1.24.0` and output the address of the cluster image. The `-e registryPort=8443` option specifies the environment variable used during the rendering of template files, where `registryPort` is set to `8443`. Please note that in this example, the cluster is not actually run.

The above is the usage guide for the `sealos create` command, hope it helps. If you encounter any problems during use, feel free to ask us.
