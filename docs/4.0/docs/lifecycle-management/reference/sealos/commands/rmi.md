---
sidebar_position: 6
---

# rmi: Remove Local Images

`sealos rmi` is a command in the Sealos command-line tool used to remove one or more locally stored images. This command helps you clean up unused or outdated images, freeing up storage space. This guide provides detailed instructions on how to use it.

## Basic Usage

The basic format of the `sealos rmi` command is as follows:

```bash
sealos rmi imageID
```

In the above command, `imageID` refers to the ID of the image you want to remove.

## Examples

For example, you can use the following command to remove an image with the ID `imageID`:

```bash
sealos rmi imageID
```

If you want to remove multiple images, simply list all the image IDs on the command line, for example:

```bash
sealos rmi imageID1 imageID2 imageID3
```

## Optional Parameters

- `-a`, `--all`: This parameter is used to remove all images. When using this option, the command will not accept any image IDs.

```bash
sealos rmi --all
```

- `-f`, `--force`: This parameter is used to force remove the image, including any containers using that image.

```bash
sealos rmi --force imageID
```

- `-p`, `--prune`: This parameter is used to prune dangling images (images without tags that are not referenced by any containers).

```bash
sealos rmi --prune
```

These are the optional parameters you can use with the `sealos rmi` command. They provide additional flexibility and control over the image removal process.

We hope this guide has been helpful in understanding how to use the `sealos rmi` command. If you have any further questions or encounter any issues during the process, please feel free to ask us.
