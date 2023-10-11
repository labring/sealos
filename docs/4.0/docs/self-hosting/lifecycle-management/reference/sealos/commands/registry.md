---
sidebar_position: 8
---

# Registry Image Repository Commands

## Sealos: Detailed Explanation and User Guide for the `sealos registry save` Command

The `registry save` command is used to pull remote Docker images to the local and save them in a specified directory. This is particularly useful for deploying container images in offline or intranet environments.

When executing the `registry save` command, it will automatically obtain the `sealos login` authentication information for repository authentication.

**Usage Guide**

1. Use context to automatically retrieve images

   Pull and save images in the default manner. This mode will automatically parse the `charts` directory, `manifests` directory, and `images` directory to get the image list.

   **Usage Example**

 ```shell
 sealos registry save --registry-dir=/tmp/registry1 my-context
 ```


2. Specified image list mode

   Pass the image list using arguments

   **Usage Example**

  ```shell
  sealos registry save --registry-dir=/tmp/registry2 --images=docker.io/library/busybox:latest
  ```

**Options**

The following options apply to the `save` command and its subcommands:

- `--max-procs`: The maximum number of parallel processes used to pull images.
- `--registry-dir`: The local directory to save images.
- `--arch`: The target architecture of the image, such as: `amd64`, `arm64`, etc.
- `--images`: The image list to be pulled and saved, separated by commas. For example: "my-image1:latest,my-image2:v1.0".

## Sealos: Detailed Explanation and User Guide for the `sealos registry serve` Command

In the process of managing Docker image repositories, Sealos provides the `sealos registry serve` command to facilitate user operations. This article will detail the usage methods and examples of the `sealos registry serve` command.

### Basic Introduction

The main function of the `sealos registry serve` command is to start a Docker distribution image repository server, supporting two modes: `filesystem` and `inmem`.

1. **Filesystem mode**: In this mode, sealctl will run a Docker distribution image repository server for the specified directory. In this mode, the image data will be stored on the hard drive.

2. **In-memory mode**: In this mode, sealctl will run a Docker distribution image repository server in memory. In this mode, the image data is only stored in memory, and the data will be lost after the process exits.

### Command Parameters

The `sealos registry serve filesystem ` command supports the following parameters:

- `--disable-logging`: Disable log output, default is false.
- `--log-level`: Configure log level, default is 'error'.
- `-p, --port`: The port the server listens to, default is a random unused port.

### Usage Examples

Here are some usage examples of the `sealos registry serve` command:

#### Start an image repository server in the filesystem

```bash
sealos registry serve filesystem --port=5000
```

The above command will start a filesystem image repository server on port 5000.

#### Start an image repository server in memory

```bash
sealos registry serve inmem 
```

The above command will start an in-memory image repository server. The stored data of this server will be lost when the process exits.

Through the `sealctl registry serve` command, users can easily manage and operate Docker image repositories. Whether in the development environment or in the production environment, it is a powerful and easy-to-use tool.

## Sealos: Detailed Explanation and User Guide of the `sealos registry passwd` Command

In the process of managing Docker image repositories, Sealos provides the `sealos registry passwd` command to facilitate users in modifying the password for the cluster registry. It offers a convenient method to help users change the password of the registry.

### Basic Usage

Use the `sealos registry passwd` command to modify the password of the registry.

```bash
sealos registry passwd
```

### Parameters

Below are the parameters of the `sealos registry passwd` command:

- `-c, --cluster-name`: Cluster name, the default is 'default'.

- `-f, --cri-shim-file-path`: Image cri shim file path, if null it will not update the image cri shim file. The default path is '/etc/image-cri-shim.yaml'.

- `-p, --htpasswd-path`: Registry password file path. The default path is '/etc/registry/registry_htpasswd'.

### Usage Steps

1. Execute the `sealos registry passwd` command, you can specify parameters according to the needs.

2. According to the command prompt, input the new password.

3. After the command is successfully executed, the registry's password will be changed to the new password.

### Demo Explanation

[![asciicast](https://asciinema.org/a/Qu05jah4ZZmjMuFR4vHEKvBsQ.svg)](https://asciinema.org/a/Qu05jah4ZZmjMuFR4vHEKvBsQ)

**In the usage process, it will let the user choose the registry type**

- registry: Binary startup, execute `systemctl restart registry` to restart the image repository.

- containerd: Containerd startup, execute "nerdctl restart sealos-registry" to restart the image repository.

- docker: Docker startup, execute "docker restart sealos-registry" to restart the image repository.

### Notice

**After changing the registry password, modify the registry password in the Clusterfile**
After changing the registry password, all nodes and services using this registry need to update their configurations to use the new password for authentication. Otherwise, they will not be able to pull or push images from this registry.

If you are unsure about how to update the configuration of nodes and services, it is recommended to consult related documentation or seek professional technical support before changing the registry password.

## Sealos: Detailed Explanation and User Guide of the `sealos registry sync` Command

Sealos' `registry sync` command can help you synchronize all images between two registries. This can be used not only for image migration but also for backing up your images.

### Basic Command Usage

Execute the `sealos registry sync` command for image synchronization:

```bash
sealos registry sync source dst
```

Here `source` represents the address of the source registry, and `dst` is the address of the target registry.

For example, if you want to synchronize all images in the registry with the address of 127.0.0.1:41669 to the registry with the address of sealos.hub:5000, you should execute the following command:

```bash
sealos registry sync 127.0.0.1:41669 sealos.hub:5000
```

### Authentication and Permissions

Before executing the `sealos registry sync` command, please ensure that you have permissions to access the source registry and the target registry. You can use `sealos login` to authenticate the registry.

### Synchronization Process

Please note that image synchronization may take some time, depending on the number and size of images, as well as the speed of the network. During the synchronization process, please keep the network connected and ensure not to interrupt the execution of the command before synchronization is complete.

Importantly, the `sealos registry sync` command supports incremental synchronization. Images that already exist in the target registry will not be re-synchronized.

### Parameter Options

The `sealos registry sync` command also provides some parameter options, allowing you to control the synchronization process more finely:

- `--override-arch ARCH`: Use the specified `ARCH` to replace the current machine architecture to select images.

- `--override-os OS`: Use the specified `OS` to replace the current operating system to select images.

- `--override-variant VARIANT`: Use the specified `VARIANT` to replace the current architecture variant to select images.

- `-a` or `--all`: If the source image is a list, synchronize all images. This is particularly useful in heterogeneous environments because by default, only images of the current architecture will be synchronized.

For example, if you want to synchronize all architecture images, you can add the `-a` parameter:

```bash
sealos registry sync -a 127.0.0.1:41669 sealos.hub:5000
```

The above is a detailed explanation and usage guide for the `sealos registry sync` command. We hope this information helps you better understand and use this command. If you encounter any problems during use, feel free to ask at any time.


## Sealos: Detailed Explanation and User Guide of the `sealos registry copy` Command

The `registry copy` command in Sealos is used to copy a specified image from one registry to another registry. This can assist you in migrating or backing up images between different registries.

### Basic Command Usage

Use the `sealos registry copy` command for image copying:

```bash
sealos registry copy source-image dst
```

Here `source-image` represents the full name of the source image (including the address and image name), and `dst` is the address of the target registry.

For example, to copy an image named `127.0.0.1:41669/my-image:tag` to a registry with the address `sealos.hub:5000`, you can execute the following command:

```bash
sealos registry copy 127.0.0.1:41669/my-image:tag sealos.hub:5000
```

### Authentication and Permissions

Before executing the `sealos registry copy` command, please ensure that you have permissions to access the source image and the target registry. You can use `sealos login` to authenticate the registry.

### Copying Process

Please note that image copying may take some time, depending on the size of the image and the speed of the network. During the copying process, please keep the network connected and ensure not to interrupt the execution of the command before the copying is complete.

### Parameter Options

The `sealos registry copy` command provides some parameter options, allowing you to control the copying process more finely:

- `--override-arch ARCH`: Use the specified `ARCH` to replace the current machine architecture to select images.

- `--override-os OS`: Use the specified `OS` to replace the current operating system to select images.

- `--override-variant VARIANT`: Use the specified `VARIANT` to replace the current architecture variant to select images.

- `-a` or `--all`: If the source image is a list, copy all images. This is particularly useful in heterogeneous environments because, by default, only images of the current architecture will be copied.

For example, if you want to copy all architecture images, you can add the `-a` parameter:

```bash
sealos registry copy -a 127.0.0.1:41669/my-image:tag sealos.hub:5000
```

The above is the usage guide for the `sealos registry copy` command. We hope it is helpful to you. If you encounter any problems during use, feel free to ask us any questions.
