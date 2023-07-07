---
sidebar_position: 6
---

# Rmi: Delete Local Images

`sealos rmi` is a command in the Sealos command-line tool that is used to delete one or more images stored locally. This command can help you clean up useless or outdated images and save storage space. This guide will detail how to use it.

## Basic Usage

The basic format of the `sealos rmi` command is as follows:

```bash
sealos rmi imageID
```

In the above command, `imageID` is the ID of the image you want to delete.

## Example

For instance, you can use the following command to delete an image with ID `imageID`:

```bash
sealos rmi imageID
```

If you want to delete multiple images, just list all the image IDs in the command line, for example:

```bash
sealos rmi imageID1 imageID2 imageID3
```

## Optional Parameters

- `-a`, `--all`: This parameter is used to delete all images. When using this option, the command will not accept any image IDs.

```bash
sealos rmi --all
```

- `-f`, `--force`: This parameter is used to forcefully delete an image and any containers using that image.

```bash
sealos rmi --force imageID
```

- `-p`, `--prune`: This parameter is used to prune dangling images (images without a tag and not referenced by any containers).

```bash
sealos rmi --prune
```

The above is the usage guide for the `sealos rmi` command. We hope it is helpful to you. If you encounter any problems during use, feel free to ask us any questions.
