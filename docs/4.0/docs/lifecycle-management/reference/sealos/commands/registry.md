---
sidebar_position: 8
---

# Registry Image Repository Commands

## Sealos: sealos registry save Command Details and User Guide

The `registry save` command is used to pull remote Docker images and save them to a specified directory. This is particularly useful for deploying container images in offline or intranet environments.

When executing the `registry save` command, it will automatically use the authentication information from `sealos login` for repository authentication.

**Usage**

1. Automatic image retrieval using context

   This mode automatically pulls and saves images using the default method. It automatically resolves the `charts` directory, `manifests` directory, and `images` directory to retrieve the image list.

   **Example**

   ```shell
   sealos registry save --registry-dir=/tmp/registry1 my-context
   ```

2. Specifying the image list

   This mode allows you to pass the image list as a parameter.

   **Example**

   ```shell
   sealos registry save --registry-dir=/tmp/registry2 --images=docker.io/library/busybox:latest
   ```

**Options**

The following options are applicable to the `save` command and its subcommands:

- `--max-procs`: The maximum number of parallel processes to use when pulling images.
- `--registry-dir`: The local directory where the images will be saved.
- `--arch`: The target architecture of the images, e.g., `amd64`, `arm64`, etc.
- `--images`: The list of images to pull and save, separated by commas. For example: "my-image1:latest,my-image2:v1.0".

## Sealos: sealos registry serve Command Details and User Guide

In the process of managing Docker image repositories, Sealos provides the `sealos registry serve` command to facilitate related operations. This document provides a detailed guide on how to use the `sealos registry serve` command along with examples.

### Overview

The `sealos registry serve` command is used to start a Docker distribution image repository server and supports two modes: `filesystem` and `inmem`.

1. **Filesystem Mode**: In this mode, sealctl runs a Docker distribution image repository server targeting a specified directory. In this mode, the image data is stored on disk.

2. **In-memory Mode**: In this mode, sealctl runs an in-memory Docker distribution image repository server. In this mode, the image data is only stored in memory and will be lost when the process exits.

### Command Parameters

The `sealos registry serve filesystem` command supports the following parameters:

- `--disable-logging`: Disable logging output, default is false.
- `--log-level`: Configure the log level, default is 'error'.
- `-p, --port`: The port on which the server listens, default is a randomly unused port.

### Usage Examples

Here are some usage examples of the `sealos registry serve` command:

#### Start the Image Repository Server in Filesystem Mode

```bash
sealos registry serve filesystem --port=5000
```

The above command starts a filesystem image repository server on port 5000.

#### Start the Image Repository Server in In-memory Mode

```bash
sealos registry serve inmem
```

The above command starts an in-memory image repository server. The server will lose the stored data when the process exits.

With the `sealctl registry serve` command, users can easily manage and operate Docker image repositories. It is a powerful and user-friendly tool for both development and production environments.

## Sealos: sealos registry passwd Command Details and User Guide

In the process of managing Docker image repositories, Sealos provides the `sealos registry passwd` command to allow users to modify the password for the cluster registry. It provides a convenient method to help users change the password for the registry.

### Basic Usage

Use the `sealos registry passwd` command to modify the password for the registry.

```bash
sealos registry passwd
```

### Parameters

The following are the parameters for the `sealos registry passwd` command:

- `-c, --cluster-name`: The name of the cluster, default is 'default'.
- `-f, --cri-shim-file-path`: The path to the image cri shim file. If empty, the image cri shim file will not be updated. The default path is '/etc/image-cri-shim.yaml'.
- `-p, --htpasswd-path`: The path to the registry password file. The default path is '/etc/registry/registry_htpasswd'.

### Usage Steps

1. Execute the `sealos registry passwd` command and configure it according to your needs by specifying the parameters if necessary.

2. Follow the command prompt and enter the new password.

3. After the command is successfully executed, the password for the registry will be modified to the new password.

### Demo Instructions

[![asciicast](https://asciinema.org/a/Qu05jah4ZZmjMuFR4vHEKvBsQ.svg)](https://asciinema.org/a/Qu05jah4ZZmjMuFR4vHEKvBsQ)

**During the usage, you will be asked to choose the registry type:**

- registry: Binary startup, execute `systemctl restart registry` to restart the image repository.
- containerd: Containerd startup, execute `nerdctl restart sealos-registry` to restart the image repository.
- docker: Docker startup, execute `docker restart sealos-registry` to restart the image repository.

### Notes

**After modifying the registry password, update the registry password in the Clusterfile**

After modifying the registry password, all nodes and services that use the registry need to update their configurations to use the new password for authentication. Otherwise, they will not be able to pull or push images from the registry.

If you are unsure how to update the configurations for nodes and services, it is recommended to consult the relevant documentation or seek professional technical support.

## Sealos: sealos registry sync Command Details and User Guide

The `registry sync` command in Sealos helps you synchronize all images between two registries. This can be used for image migration and also for backing up your images.

### Basic Command Usage

Execute the `sealos registry sync` command to synchronize the images:

```bash
sealos registry sync source dst
```

Here, `source` represents the address of the source registry, and `dst` is the address of the destination registry.

For example, if you want to sync all images from the registry at 127.0.0.1:41669 to the registry at sealos.hub:5000, you would execute the following command:

```bash
sealos registry sync 127.0.0.1:41669 sealos.hub:5000
```

### Authentication and Permissions

Before executing the `sealos registry sync` command, ensure that you have the necessary permissions to access the source and destination registries. You can authenticate with the registries using `sealos login`.

### Synchronization Process

Please note that image synchronization may take some time, depending on the number and size of the images, as well as the network speed. During the synchronization process, ensure network connectivity and do not interrupt the command execution before the synchronization is complete.

It is important to know that the `sealos registry sync` command supports incremental synchronization. It only synchron

izes images that have changed or are missing in the destination registry. This reduces the time and bandwidth required for synchronization.

With the `sealos registry sync` command, you can easily synchronize Docker images between registries, facilitating image migration and backup processes.
