---
sidebar_position: 6
---

# push: Upload Images

The `sealos push` command is a command in the Sealos command-line tool used to push images to a specified location. This command is particularly useful when you need to push local Docker images to a remote image registry. This guide will provide detailed instructions on how to use this command.

## Basic Usage

The basic format of the `sealos push` command is as follows:

```bash
sealos push IMAGE_ID DESTINATION
```

In the above command, `IMAGE_ID` refers to the ID of the image you want to push, and `DESTINATION` refers to the location where you want to push the image. The `DESTINATION` uses the "transport:details" format, and if not specified, the source image will be reused as the destination.

In Sealos, the transport specifies the format and location of the source and destination images during the copy process. Here are the various transports supported by Sealos:

1. `containers-storage`: This transport is used for storing and managing containers running locally. For example, images of containers created using Podman or CRI-O.

2. `dir`: This transport stores images in a directory on the local file system, following the OCI layout.

3. `docker`: This transport is used to interact with Docker registries such as Docker Hub or any other compatible private registry.

4. `docker-archive`: This transport stores images as a local Docker tar file (`.tar`), which is the native format of Docker.

5. `docker-daemon`: This transport is used to interact with the local Docker daemon, allowing extraction of images from the Docker daemon or pushing images to the Docker daemon.

6. `oci`: This transport stores images in a directory following the OCI layout, which is an open container image format.

7. `oci-archive`: This transport stores images as a local OCI tar file (`.tar`).

8. `ostree`: This transport stores images in an OSTree repository, which is a file system that supports atomic upgrades and rollbacks.

9. `sif`: This is the Singularity SIF format, primarily used for high-performance computing and data-intensive applications.

Examples:

- Push an image to a Docker registry: `sealos push my-image:latest docker://my-registry.example.com/my-image:latest`

- Export an image from the Docker daemon: `sealos push docker-daemon:my-image:latest dir:/path/to/save/`

- Push an image to local container storage: `sealos push my-image:latest containers-storage:my-new-image:latest`

## Examples

For example, you can use the following command to push an image to a repository at `registry.example.com`:

```bash
sealos push my_image_id docker://registry.example.com/my_repository:my_tag
```

## Optional Parameters

- `--all`: This parameter is used to push all images referenced by manifest lists.

- `--authfile`: This parameter specifies the path to the authentication file. It can be overridden using the `REGISTRY_AUTH_FILE` environment variable.

- `--cert-dir`: This parameter specifies the path to the certificate required to access the registry.

- `--compression-format`: This parameter specifies the compression format to use.

- `--compression-level`: This parameter specifies the compression level to use.

- The `--cr-option` parameter controls whether to push custom resources (CRs) associated with the image to the target registry.

  Specifically, the available values for this parameter are:

  - "yes": The image and its associated CRs will be pushed to the target registry.

  - "no": Only the image will be pushed, and no CRs will be pushed.

  - "only": Only the CRs will be pushed, and the image itself will not be pushed.

  - "auto": The decision of whether to push the image and CRs will be made automatically based on their actual state. For example, if there are changes to the CRs or they do not exist in the target registry, they will be pushed.

Please note that this parameter is primarily used when dealing with images that contain custom resources (such as Kubernetes CRD objects), allowing you to have more flexibility and control over the image and CR push process.

- `--creds`: This parameter is used to access the registry using the `[username[:password]]` format.

- `--digestfile`: This parameter writes the digest of the resulting image to a file after the image is copied.

- `-D`, `--disable-compression`: This parameter disables layer compression.

- `--encrypt-layer`: This parameter specifies the layer(s) to encrypt, with 0-indexed layer indices supporting negative indices (e.g., 0 is the first layer, -1 is the last layer). If not defined, all layers will be encrypted when the encryption-key flag is specified.

- `--encryption-key`: This parameter specifies the key required to encrypt the image, used in conjunction with the encryption protocol (e.g., jwe:/path/to/key.pem).

- `-f`, `--format`: This parameter specifies the manifest type to use in the destination (oci, v2s1, or v2s2) (default is the manifest type of the source with fallback).

- `-q`, `--quiet`: This parameter suppresses progress information while pushing the image.

- `--remove-signatures`: This parameter does not copy signatures when pushing the image.

- `--retry`: This parameter specifies the number of retries to perform in case of push/pull failures.

- `--retry-delay`: This parameter specifies the delay between retries in case of push/pull failures.

- `--rm`: This parameter removes the manifest list after a successful push.

- `--sign-by`: This parameter signs the image with the GPG key of the specified `FINGERPRINT`.

These are the usage guidelines for the `sealos push` command. We hope this helps you. If you encounter any issues during the process, please feel free to ask us.
