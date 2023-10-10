---
sidebar_position: 6
---

# Building Images with `sealos build`

The `build` command in Sealos is used to build OCI images using instructions from Sealfiles, Kubefiles, Dockerfiles, or Containerfiles. This is the fundamental command in Sealos for building cluster images.

If no parameters are specified, Sealos will use the current working directory as the build context and look for instruction files. If no Sealfile, Kubefile, Dockerfile, or Containerfile is found, the build will fail.

Here are some key options for the `build` command:

1. `--all-platforms`: Attempts to build the image for all supported base image platforms.
2. `--authfile`: Path to the authentication file.
3. `--build-arg`: Provides an `argument=value` to the builder.
4. `--build-context`: Provides additional build context to the builder as `argument=value`.
5. `--creds`: Credentials to access the registry as `[username[:password]]`.
6. `-D, --disable-compression`: Disables layer compression by default.
7. `--env`: Sets environment variables for the image.
8. `-f, --file`: Pathname or URL of the Dockerfile.
9. `--force-rm`: Always removes intermediate containers after a build, even if the build fails.
10. `--format`: Format for the manifest and metadata of the built image.
11. `--from`: Replaces the value of the first FROM instruction in the Containerfile with the specified image name.
12. `--http-proxy`: Passes the HTTP Proxy environment variable.
13. `--isolation`: Process isolation `type` to use, can be 'oci' or 'chroot'.
14. `--max-pull-procs`: Maximum number of goroutines to use for pulling images.
15. `--platform`: Sets the OS/ARCH/VARIANT for the image to the provided value instead of the host's current operating system and architecture.
16. `--pull`: Pulls the image from the registry, if new or not present in the store. Can be set to false, always, or never.
17. `-q, --quiet`: Suppresses the build output and image read/write progress.
18. `--retry`: Number of times to retry on push/pull failure.
19. `--retry-delay`: Delay in seconds between retries on push/pull failure.
20. `--rm`: Removes intermediate containers after a successful build.
21. `--save-image`: Saves resolved images from a specific directory in the registry format.
22. `--sign-by`: Signs the image with the GPG key of the specified `FINGERPRINT`.
23. `-t, --tag`: Name and optionally a tag in the 'name:tag' format to apply to the built image.
24. `--target`: Sets the target build stage to build.
25. `--timestamp`: Sets the created timestamp to the specified epoch seconds for reproducible builds. Default is the current time.

These options provide flexibility for various build requirements, including platform-specific builds, environment variable settings, build context management, image signing, and more. With the `--save-image` option, Sealos can automatically recognize and save the required images (including those resolved from image lists, Helm charts, and manifests) in the Docker Registry format.

The process isolation mode `--isolation` supports two parameters: 'oci' and 'chroot'. Choose 'oci' mode if OCI is supported locally and 'chroot' mode if OCI is not supported.

The `--save-image` option is used in Sealos build commands to automatically find and save the required images during the build process. In Sealos, building an image may involve other dependent images. These dependent

images can come from image lists, Helm charts, or cluster manifests. When using the `--save-image` option, Sealos will automatically resolve these dependencies based on the build context and save them in the Docker Registry format.

For example, here is an example using the `--save-image` option:

```bash
sealos build -t myapp:v1.0.0 -f Dockerfile .
```

In this example, Sealos will use the current directory as the build context, read the build instructions from the Dockerfile, and attempt to build an image tagged as `myapp:v1.0.0`. Additionally, Sealos will resolve all base images referenced in the Dockerfile's `FROM` instructions and save those images as well. These images will be saved in the Docker Registry format and can be pushed directly to a Docker Registry.

If your build context also includes Helm charts or cluster manifests, Sealos will also resolve the images referenced in those files and save them accordingly.

Overall, the `--save-image` option provides a convenient way for Sealos to handle image dependencies during the build process, greatly improving the convenience and efficiency of building images.

Here are some detailed examples:

- [Build with Image Manifests](/self-hosting/lifecycle-management/operations/build-image/build-image-image_list.md)
- [Build with Deploy Manifests](/self-hosting/lifecycle-management/operations/build-image/build-image-manifests.md)
- [Build with Helm Charts](/self-hosting/lifecycle-management/operations/build-image/build-image-helm_charts.md)
- [Build with Binary](/self-hosting/lifecycle-management/operations/build-image/build-image-binary.md)
- [Build with go-template](/self-hosting/lifecycle-management/operations/build-image/build-image-go_template.md)
- [Build with exec and scp](/self-hosting/lifecycle-management/operations/build-image/build-image-scp_exec.md)

With the `build` command in Sealos, you can build OCI images based on various instruction files to provide the required images for Sealos. This process includes handling various instructions in Dockerfiles or other instruction files, such as `FROM`, `RUN`, `ADD`, etc., as well as managing image layers, labels, and more. The build process also involves pulling base images, running commands, saving the results, and more. Each step can be finely controlled and customized using the options mentioned above to accommodate different build requirements.

That's the usage guide for the `sealos build` command. We hope this helps you. If you have any questions or encounter any issues during the process, feel free to ask us.
