---
sidebar_position: 6
---

# merge: Merge Images

The `sealos merge` command in Sealos is used to merge multiple images into a single image. It reads the Dockerfiles of the input images and combines the commands and layer structures into a new image. The logic of this command is similar to the `build` command, and many parameters are the same.

This functionality is particularly useful when multiple images share layers, as it can reduce the size of the image and save storage space. Additionally, since the merged image contains the functionality of multiple images, it can help simplify application deployment.

Here is a basic example of using `sealos merge`:

```bash
sealos merge -t new:0.1.0 kubernetes:v1.19.9 mysql:5.7.0 redis:6.0.0
```

In this example, the three images `kubernetes:v1.19.9`, `mysql:5.7.0`, and `redis:6.0.0` are merged into a new image named `new:0.1.0`.

The `sealos merge` command provides various options to customize the merge process. For example, `--all-platforms` attempts to build the image for all base image platforms, `--build-arg` provides arguments to the builder, `--no-cache` disables the use of existing cached images, and so on.

Please note that `sealos merge` builds the new image based on the Dockerfiles of the input images. If the Dockerfiles of the input images are incompatible or have any build errors, the command may fail. When using the `sealos merge` command, make sure you understand the Dockerfiles of each input image and adjust them as needed.
