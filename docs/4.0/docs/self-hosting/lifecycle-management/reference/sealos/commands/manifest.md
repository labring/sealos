---
sidebar_position: 6
---

# Image Manifest

The `manifest` command of Sealos is used to create, modify, and push manifest lists and image indexes. These functions are mainly used to handle multi-architecture support of images. In Docker and OCI image specifications, manifest lists (also known as "fat manifests") or image indexes allow an image tag (like `myimage:latest`) to be used on various hardware architectures (like amd64, arm64, ppc64le, etc.).

Here are some of the major `manifest` subcommands:

1. `create`: Creates a new manifest list or image index. Example: `sealos manifest create localhost/list`
2. `add`: Adds an image to the manifest list or image index. Example: `sealos manifest add localhost/list localhost/image`
3. `annotate`: Adds or updates information in entries of the manifest list or image index. Example: `sealos manifest annotate --annotation A=B localhost/list localhost/image`
4. `inspect`: Displays the content of the manifest list or image index. Example: `sealos manifest inspect localhost/list`
5. `push`: Pushes the manifest list or image index to the registry. Example: `sealos manifest push localhost/list transport:destination`
6. `remove` and `rm`: Removes entries from the manifest list or image index, or completely deletes the manifest list or image index. Example: `sealos manifest remove localhost/list sha256:entryManifestDigest` or `sealos manifest rm localhost/list`

With the `sealos manifest` command, you can flexibly manage manifest lists or image indexes, providing support for multi-architecture Docker or OCI images. Users can create custom manifest lists according to their needs, making it convenient to deploy and run Docker images on different hardware architectures.

Users who want to build multi-architecture images through the manifest command can refer to the document [Building Cluster Images that Support Multiple Architectures](/self-hosting/lifecycle-management/operations/build-image/build-multi-arch-image.md).
