---
sidebar_position: 6
---

# Push Image

`sealos push` is a command in the Sealos command-line tool, used to push images to a specified location. This command is particularly useful when you need to push local Docker images to a remote image repository. This guide will provide a detailed introduction to its usage.

## Basic Usage

The basic format of the `sealos push` command is as follows:

```bash
sealos push IMAGE_ID DESTINATION
```

In the above command, `IMAGE_ID` is the ID of the image you want to push, and `DESTINATION` is the location where you want to push it. The `DESTINATION` uses the "transport:details" format. If not specified, the source IMAGE is reused as the DESTINATION.

In Sealos, the transport defines the format and location of the source image and the target image during the copying process. Here are the various transports supported by Sealos:

1. `containers-storage`: This transport is used for storing and managing containers running locally, such as images of containers created using Podman or CRI-O.

2. `dir`: This transport stores the image in a directory in the local file system, the structure of which conforms to the OCI layout.

3. `docker`: This transport is used for interacting with Docker registries, such as Docker Hub or any other compatible private registry.

4. `docker-archive`: This transport stores the image as a local Docker tar file (`.tar`), which is Docker's native format.

5. `docker-daemon`: This transport is used for interacting with the local Docker daemon. It can extract images from the Docker daemon or push images to the Docker daemon.

6. `oci`: This transport stores the image in a directory that conforms to the OCI layout, which is an open container image format.

7. `oci-archive`: This transport stores the image as a local OCI tar file (`.tar`).

8. `ostree`: This transport stores the image in an OSTree repository, which is a file system that supports atomic upgrades and rollbacks.

9. `sif`: This is the Singularity SIF format, mainly used for high-performance computing and data-intensive applications.

Examples:

- Push an image to a Docker registry: `sealos push my-image:latest docker://my-registry.example.com/my-image:latest`

- Export an image from the Docker daemon: `sealos push docker-daemon:my-image:latest dir:/path/to/save/`

- Push an image to local container storage: `sealos push my-image:latest containers-storage:my-new-image:latest`

## Example

For example, you can use the following command to push an image to the `registry.example.com` repository:

```bash
sealos push my_image_id docker://registry.example.com/my_repository:my_tag
```

## Optional Parameters

- `--all`: This parameter is used to push all images referred by the manifest list.

- `--authfile`: This parameter is used to specify the path to the authentication file. The REGISTRY_AUTH_FILE environment variable can be overridden.

- `--cert-dir`: This parameter is used to specify the path to the certificate required to access the registry.

- `--compression-format`: This parameter is used to specify the compression format to be used.

- `--compression-level`: This parameter is used to specify the compression level to be used.

- `--cr-option`: This parameter is used to control whether the image's Custom Resources (CR) are pushed to the target image repository.

  Specifically, the optional values for this parameter include:

  - "yes": The image and its associated CR will be pushed to the target image repository.

  - "no": Only push the image, do not push any CR.

  - "only": Only push the CR, do not push the image itself.

  - "auto": Automatically decide whether to push based on the actual status of the image and CR. For example, if the CR has changed or does not exist in the target repository, it will be pushed.

  Please note, this parameter is mainly used when dealing with images containing custom resources (such as Kubernetes CRD objects), allowing you to more flexibly control the push process of images and CRs.

- `--creds`: This parameter is used to access the registry, in the form of `[username[:password]]`.

- `--digestfile`: This parameter, after copying the image, writes the digest of the resulting image to a file.

- `-D`, `--disable-compression`: This parameter is used to not compress layers.

- `--encrypt-layer`: This parameter is used to specify the layer to be encrypted. 0-index layer index supports negative index (for example, 0 is the first layer, -1 is the last layer). If not defined, all layers will be encrypted when the encryption-key flag is specified.

- `--encryption-key`: This parameter is used to specify the key needed to encrypt the image, used together with the encryption protocol (for example, jwe:/path/to/key.pem).

- `-f`, `--format`: This parameter is used to specify the type of manifest to use in the target (oci, v2s1, or v2s2) (default is the source's

manifest type, with fallback).

- `-q`, `--quiet`: This parameter is used to not output progress information when pushing the image.

- `--remove-signatures`: This parameter is used to not copy signatures when pushing the image.

- `--retry`: This parameter is used to specify the number of retries when the push/pull fails.

- `--retry-delay`: This parameter is used to specify the delay between retries when the push/pull fails.

- `--rm`: This parameter is used to delete the manifest list after the push is successful.

- `--sign-by`: This parameter is used to sign the image using a GPG key with the specified `FINGERPRINT`.

That's the guide to using the `sealos push` command, and I hope it's helpful to you. If you encounter any problems during use, feel free to ask us.
