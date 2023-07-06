---
sidebar_position: 6
---

# load: Load Image

The `sealos load` command is used to load images from an archive file. This command is useful when you need to import images from existing archive files, especially in environments without internet connectivity.

## Usage

```
sealos load [flags] [options]
```

## Flags

Here are the flags for the `sealos load` command:

- `-i, --input=''`: Load the image from a tar archive file.

- `--platform=[linux/arm64/v8]`: When selecting images, prefer the specified OS/ARCH instead of the current operating system and architecture.

- `-t, --transport='oci-archive'`: Specify the image transport when loading from a tar archive file. Available options are oci-archive and docker-archive.

- `--variant=''`: Override the `variant` for the specified image.

## Examples

Here is an example of loading an image from an archive file: `sealos load -i myimage.tar`

Note that when using the `sealos load` command, you need to ensure that the specified archive file exists and is in the correct format. If you encounter any issues while importing the image, you may need to check your archive files to ensure they are not corrupted or formatted incorrectly.

That concludes the usage guide for the `sealos load` command. We hope this information has been helpful to you. If you have any further questions or encounter any issues during usage, please don't hesitate to reach out to us.
