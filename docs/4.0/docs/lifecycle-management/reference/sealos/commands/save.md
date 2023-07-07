---
sidebar_position: 6
---

# Save: Store Images

`sealos save` is a command in the Sealos command-line tool used to save images to archive files. This command can help you conveniently back up and migrate your images. This guide will detail its usage.

## Basic Usage

The basic `sealos save` command format is as follows:

```bash
sealos save -o outputFilename imageName
```

In the above command, `outputFilename` is the name of the archive file you want to save, and `imageName` is the name of the image you want to save.

## Example

For example, you can use the following command to save an image named `labring/kubernetes:latest` to an archive file named `kubernetes.tar`:

```bash
sealos save -o kubernetes.tar labring/kubernetes:v1.24.0
```

## Optional Parameters

- `-t`, `--transport`: This parameter is used to specify the transport method for saving the image. The currently available options are `oci-archive` and `docker-archive`. The default value is `oci-archive`.

For example, you can use the following command to save an image named `labring/kubernetes:latest` to an archive file named `kubernetes.tar` in the `docker-archive` method:

```bash
sealos save -o kubernetes.tar -t docker-archive labring/kubernetes:v1.24.0
```

The above is the usage guide of the `sealos save` command, and we hope it is helpful to you. If you encounter any problems during use, feel free to ask us.
