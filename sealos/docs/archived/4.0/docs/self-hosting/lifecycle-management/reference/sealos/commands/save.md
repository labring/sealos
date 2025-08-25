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

- `--format`: This parameter is used to specify the transport format for saving the image. The currently available options are `oci-archive`, `docker-archive`, `oci-dir`, and `docker-dir`. The default value is `oci-archive`.
- `-m`: This parameter can be used to save multiple images at the same time, but it is only applicable to the `docker-archive` format.


For example, you can use the following command to save an image named `labring/kubernetes:latest` to an archive file named `kubernetes.tar` in the `docker-archive` method:

```bash
sealos save -o kubernetes.tar --format docker-archive labring/kubernetes:v1.24.0
sealos save -o kubernetes.tar -m --format docker-archive labring/kubernetes:v1.24.0 labring/helm:v3.5.0
```

The above is the usage guide of the `sealos save` command, and we hope it is helpful to you. If you encounter any problems during use, feel free to ask us.
