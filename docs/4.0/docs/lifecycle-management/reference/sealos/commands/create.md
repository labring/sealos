---
sidebar_position: 6
---

# create: Create Working Directory

The `sealos create` command is a command in the Sealos command-line tool used to create a working directory for a cluster without actually running it. It is primarily used for inspection of the cluster image. This guide will provide detailed information on how to use this command and its options.

## Basic Usage

The `sealos create` command is used to create a working directory for a cluster without actually running it. It is mainly used for debugging or testing purposes. It can output the address of the cluster image, allowing you to verify if the cluster image content matches your expectations.

```bash
sealos create docker.io/labring/kubernetes:v1.24.0
```

In the above command, `clustername` represents the name of the cluster you want to create.

## Options

The `sealos create` command provides the following options:

- `-c, --cluster='default'`: Specifies the name of the cluster to create but not actually run. Defaults to `default`.

- `--platform='linux/arm64/v8'`: Sets the OS/architecture/version of the image to the provided value instead of the current OS and architecture of the host (e.g., `linux/arm`).

- `--short=false`: If true, only prints the mount path.

Each option can be followed by an argument.

## Example

For example, you can use the following command to create a cluster named `mycluster` without actually running it:

```bash
sealos create docker.io/labring/kubernetes:v1.24.0
```

This command will create a working directory for a cluster with the image name `docker.io/labring/kubernetes:v1.24.0` and output the address of the cluster image, but the cluster will not be actually running.

That concludes the usage guide for the `sealos create` command. We hope this information has been helpful to you. If you encounter any issues during the usage, please feel free to ask us for assistance.
