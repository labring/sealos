---
sidebar_position: 6
---

# Tag: Add Image Names

`sealos tag` is a command in the Sealos command-line tool, used to add one or more additional names to the images stored locally. This command can help you better manage your images. This guide will detail its usage.

## Basic Usage

The basic `sealos tag` command format is as follows:

```bash
sealos tag imageName newName
```

In the above command, `imageName` is the name of the image you want to operate on, and `newName` is the new tag you want to add.

## Examples

For example, you can use the following command to add a new name `firstNewName` to an image named `imageName`:

```bash
sealos tag imageName firstNewName
```

You can also add multiple names at once, for example, add two names `firstNewName` and `SecondNewName`:

```bash
sealos tag imageName firstNewName SecondNewName
```

The above is the usage guide for the `sealos tag` command, and we hope it is helpful to you. If you encounter any problems during use, feel free to ask us.
