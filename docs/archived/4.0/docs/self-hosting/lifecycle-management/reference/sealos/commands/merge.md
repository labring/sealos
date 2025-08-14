---
sidebar_position: 6
---

# Merge Image Merging

The primary function of the `merge` command in Sealos is to merge multiple images into one. It does this by reading the Dockerfiles of each input image, merging the commands and layer structures into a new image. The running logic of this command is very similar to the `build` command, and many of the parameters are the same.

This function is very useful when multiple images share layers, as it can reduce the size of the image and save storage space. Moreover, since the merged image contains all the functionalities of multiple images, it can help simplify application deployment.

Here is a basic usage example of `sealos merge`:

```bash
sealos merge -t new:0.1.0 kubernetes:v1.19.9 mysql:5.7.0 redis:6.0.0
```

In this example, the three images `kubernetes:v1.19.9`, `mysql:5.7.0`, and `redis:6.0.0` are merged into a new image `new:0.1.0`.

The `sealos merge` command provides rich options to customize the merging process, such as `--all-platforms` to attempt to build images for all base image platforms, `--build-arg` to provide parameters to the builder, `--no-cache` to disable existing cached images, and so on.

Please note that the `sealos merge` command builds a new image based on the Dockerfiles of each input image. Therefore, if the Dockerfiles of the input images are incompatible, or there are any build errors, this command may fail. When using the `sealos merge` command, make sure you understand the Dockerfile of each input image and adjust as needed.
