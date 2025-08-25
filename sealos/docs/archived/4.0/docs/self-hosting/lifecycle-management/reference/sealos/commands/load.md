---
sidebar_position: 6
---

# Load Image

`sealos load` is a command used to load images from archive files. This is very useful when you need to import images from existing archive files, especially in environments without a network connection.

## Usage:

`sealos load [flags] [options]`

## Parameters:

Here are the parameters for the `sealos load` command:

- `-i, --input=''`: Load image from a tar archive file.

## Examples:

- Load an image from an archive file: `sealos load -i myimage.tar`

Note that when using the `sealos load` command, you need to ensure that the specified archive file exists and is correctly formatted. If you encounter problems when importing images, you may need to check your archive files to ensure they have not been corrupted or incorrectly formatted.

That's the usage guide for the `sealos load` command, and we hope it has been helpful. If you encounter any problems during usage, feel free to ask us.
