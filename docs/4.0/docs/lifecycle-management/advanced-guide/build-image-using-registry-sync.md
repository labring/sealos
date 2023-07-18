---
sidebar_position: 2
---

# Guide to Image Building Improvement

## Deep Understanding of Sealos Image Building

To understand the work behind Sealos image building, we will first reveal what operations it actually performs at the underlying level. Here is an intuitive architectural diagram:

![](images/build.png)

Sealos covers the following core steps in the image building process:

- **Cache images**: Parse the working directory during the build execution (here we call it the "context" directory), save the cache image to the registry structure, and store it in the ./registry directory.
- **Build images**: Build images in the context directory and generate new images. (Please note, you need to copy the ./registry directory when building images.)

## Enhancing Image Building Efficiency

In the current project, we have borrowed the source code of `github.com/distribution/distribution`. During the process of caching images, we directly call the registry's sdk and start the registry-proxy function. With the caching ability of the image repository, we cache the image and store it in the context/registry directory.

The key to this process is to call the method of the distribution repository to save the image:

- Start the registry-proxy function.
- Save image digest and related index data (by calling the saveManifestAndGetDigest method).
- Save image file data (by calling the saveBlobs method).

This method does have some significant advantages:

- Lightweight: Images can be saved without relying on other components.
- Free control: You can freely control the save logic without relying on third-party components.

However, we have also noticed some potential problems:

- For beginners, the code is difficult to understand and the logic here is not easy to grasp.
- Unable to cache using the token authentication method.
- Need to rely on some temporary storage space, which requires space.

Considering these issues, we decided to try a new mode: start a lightweight registry locally and use the sdk of `skopeo copy` for code reuse. This change directly solves all the previous problems.

![](images/registry-build.png)

**Therefore, the new construction method ✨Image Repository Sync✨ gracefully debuts 🎉🎉**

The [#3154](https://github.com/labring/sealos/pull/3154) PR in the official repository has completed the implementation of this feature. Currently, Sealos supports these two ways of image construction. Next, I will introduce how to start the new feature (if the new feature performs stably, we may abandon the old construction method).

## How to Start the New Feature

> Sealos v4.3.0 and later versions support this function by default.

Starting the new feature is very simple, just add an environment variable before you build the image. This feature supports both build and merge commands.

```shell
SEALOS_REGISTRY_SYNC_EXPERIMENTAL=true sealos build -t test .
```

Here is the expected output after executing the above command:

```tex
SEALOS_REGISTRY_SYNC_EXPERIMENTAL=true sealos build -t test .
Getting image source signatures
Copying blob fee740108510 done
Copying config f92f3ea6e4 done
Writing manifest to image destination
Storing signatures
Getting image source signatures
Copying blob 08409d417260 done
Copying config 44dd6f2230 done
Writing manifest to image destination
Storing signatures
2023-06-01T13:16:07 info saving images busybox, alpine
STEP 1/2: FROM scratch
STEP 2/2: COPY registry ./registry
COMMIT test
Getting image source signatures
Copying blob 13ab73c881c8 done
Copying config 4e22d16b36 done
Writing manifest to image destination
Storing signatures
--> 4e22d16

b366
Successfully tagged localhost/test:latest
4e22d16b366e9fec25641522a74cbd73a7db67dc0516b8f8e00200c4d0551592
```

I hope the above content can help you better understand and use Sealos's new image building method.
