---
sidebar_position: 6
---

# manifest: Image Manifest

The `sealos manifest` command in Sealos is used to create, modify, and push manifest lists and image indexes. These functionalities are primarily used for handling multi-architecture support for images. In the Docker and OCI image specifications, a manifest list (also known as a "fat manifest") or image index allows an image tag (such as `myimage:latest`) to be used across multiple hardware architectures (such as amd64, arm64, ppc64le, etc.).

Here are some key subcommands of `manifest`:

1. `create`: Create a new manifest list or image index. Example: `sealos manifest create localhost/list`
2. `add`: Add an image to a manifest list or image index. Example: `sealos manifest add localhost/list localhost/image`
3. `annotate`: Add or update information in the entries of a manifest list or image index. Example: `sealos manifest annotate --annotation A=B localhost/list localhost/image`
4. `inspect`: Display the contents of a manifest list or image index. Example: `sealos manifest inspect localhost/list`
5. `push`: Push a manifest list or image index to a registry. Example: `sealos manifest push localhost/list transport:destination`
6. `remove` and `rm`: Remove an entry from a manifest list or image index or completely delete a manifest list or image index. Example: `sealos manifest remove localhost/list sha256:entryManifestDigest` or `sealos manifest rm localhost/list`

With the `sealos manifest` command, you can manage manifest lists or image indexes flexibly, providing support for multi-architecture Docker or OCI images. Users can create custom manifest lists according to their needs, making it convenient to deploy and run Docker images on different hardware architectures.

If users want to build multi-architecture images using the manifest command, they can refer to the documentation [Building Multi-Architecture Cluster Images](https://docs.sealos.io/docs/lifecycle-management/operations/build-image/build-multi-arch-image).
