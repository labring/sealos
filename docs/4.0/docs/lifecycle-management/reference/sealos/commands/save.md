---
sidebar_position: 6
---

# save: Save Images

The `sealos save` command in Sealos is used to save images to an archive file. This command helps you conveniently backup and migrate your images. This guide provides detailed instructions on how to use it.

## Basic Usage

The basic format of the `sealos save` command is as follows:

```bash
sealos save -o outputFilename imageName
```

In the above command, `outputFilename` represents the name of the archive file you want to save, and `imageName` represents the name of the image you want to save.

## Examples

For example, you can use the following command to save an image named `labring/kubernetes:v1.24.0` to an archive file named `kubernetes.tar`:

```bash
sealos save -o kubernetes.tar labring/kubernetes:v1.24.0
```

## Optional Parameters

- `-t`, `--transport`: This parameter is used to specify the transport method for saving the image. The available options are `oci-archive` and `docker-archive`. The default value is `oci-archive`.

For example, you can use the following command to save an image named `labring/kubernetes:v1.24.0` in `docker-archive` format to an archive file named `kubernetes.tar`:

```bash
sealos save -o kubernetes.tar -t docker-archive labring/kubernetes:v1.24.0
```

This concludes the usage guide for the `sealos save` command. We hope you find it helpful. If you have any questions or encounter any issues during the usage, feel free to ask us.
