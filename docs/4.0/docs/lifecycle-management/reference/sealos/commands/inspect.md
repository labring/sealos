---
sidebar_position: 6
---

# Inspect Details

Sealos' `inspect` command is primarily used to view the configuration information of build containers or built images. The command supports viewing detailed information about an image or container, including its metadata, environment variables, startup commands, etc.

## Basic Usage

Use the `sealos inspect` command to view the configuration information of a specified container or image. For example, to view the configuration of a specified container:

```bash
sealos inspect containerID
```

Or to view the configuration of a specified image:

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

3. View configuration information of an image ID:

    ```bash
    sealos inspect --type image @imageID # Or just input the imageID, '@' is optional
    ```

4. View configuration information of a remote image repository:

    ```bash
    sealos inspect --type image docker://alpine:latest
    ```

5. View configuration information of an image in a local OCI archive file:

    ```bash
    sealos inspect --type image oci-archive:/abs/path/of/oci/tarfile.tar
    ```

6. View configuration information of an image in a local Docker archive file:

    ```bash
    sealos inspect --type image docker-archive:/abs/path/of/docker/tarfile.tar
    ```

7. Display image environment variables in Go template format:

    ```bash
    sealos inspect --format '{{.OCIv1.Config.Env}}' alpine
    ```

## Parameters

Here are some common parameters for the `sealos inspect` command:

- `-f, --format`: Display output results in Go template format. **Template structure code [InspectOutput](https://github.com/labring/sealos/blob/f8a17787822714c5fdf21f2a75cc86fadb88adfa/pkg/buildah/inspect.go#L189)**

- `-t, --type`: Specify the type to view, which can be a container (`container`) or an image (`image`).

Depending on your needs, you can combine these parameters to get specific configuration information. For example, using the `-t` parameter can specify whether you want to view the configuration information of the container or the image; using the `-f` parameter, you can define a specific output format, which is convenient for processing or parsing the output results.

That's the usage guide for the `sealos inspect` command, and we hope it has been helpful. If you encounter any problems during usage, feel free to ask us.
