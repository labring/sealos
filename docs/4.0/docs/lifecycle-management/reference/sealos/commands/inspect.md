---
sidebar_position: 6
---

# inspect: Detailed Information

The `sealos inspect` command in Sealos is primarily used to view the configuration information of a built container or image. This command allows users to view detailed information about images or containers, including their metadata, environment variables, and startup commands.

## Basic Usage

Use the `sealos inspect` command to view the configuration information of a specified container or image. For example, to view the configuration of a specific container:

```bash
sealos inspect containerID
```

Or to view the configuration of a specific image:

```bash
sealos inspect --type image imageWithTag
```

## Examples

Here are some common examples of the `sealos inspect` command:

1. View container configuration:

   ```bash
   sealos inspect containerID
   ```

2. View image configuration:

   ```bash
   sealos inspect --type image imageWithTag
   ```

3. View configuration information for an image ID:

   ```bash
   sealos inspect --type image @imageID # or directly input the imageID, '@' is optional
   ```

4. View configuration information for a remote image repository:

   ```bash
   sealos inspect --type image docker://alpine:latest
   ```

5. View configuration information for an image in a local OCI archive file:

   ```bash
   sealos inspect --type image oci-archive:/abs/path/of/oci/tarfile.tar
   ```

6. View configuration information for an image in a local Docker archive file:

   ```bash
   sealos inspect --type image docker-archive:/abs/path/of/docker/tarfile.tar
   ```

7. Display image environment variables using Go template format:

   ```bash
   sealos inspect --format '{{.OCIv1.Config.Env}}' alpine
   ```

## Parameters

Here are some commonly used parameters of the `sealos inspect` command:

- `-f, --format`: Use Go template format to display the output. **Template structure code [InspectOutput](https://github.com/labring/sealos/blob/f8a17787822714c5fdf21f2a75cc86fadb88adfa/pkg/buildah/inspect.go#L189)**.

- `-t, --type`: Specify the type to view, which can be either `container` or `image`.

You can combine these parameters according to your needs to obtain specific configuration information. For example, using the `-t` parameter allows you to specify whether you want to view the configuration information of a container or an image. Using the `-f` parameter, you can define a specific output format for convenient processing or parsing of the output results.

That concludes the usage guide for the `sealos inspect` command. We hope this information has been helpful to you. If you encounter any issues during usage, please feel free to ask us for assistance.
