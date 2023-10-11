---
sidebar_position: 11
---

# Application Cluster Image Usage Guide

Sealos provides a repository called [cluster-image](https://github.com/labring-actions/cluster-image) on GitHub for building and publishing application images for Kubernetes clusters. These images can be created by submitting code to this repository and can be published to `docker.io/labring/` as official application images. It supports building Docker container images as well as cluster images for applications.

## Types of Images

The repository supports three types of image builds:

- **Application Cluster Images**: These are primarily for building application images using GitHub Actions and support both amd64 and arm64 architectures.
- **Configuration Cluster Images**: These are mainly for building configuration images using GitHub Actions. They are not container images and are not architecture-specific. They typically contain configuration scripts or customizations to default configurations.
- **Docker Images**: These are mainly for building container images using GitHub Actions and support both amd64 and arm64 architectures.

## Workflow for Image Builds

You can trigger image builds directly in the GitHub repository by creating an issue. Here are a few examples:

- `/imagebuild_dockerimages helm v3.8.2 Key1=Value1,Key2=Value2`
- `/imagebuild_configs coredns v0.0.1`
- `/imagebuild_apps helm v3.8.2`

The format of the image build commands for each type is `/imagebuild_<type> <app_name> <version> [Key=Value,...]`, where `<type>` can be `dockerimages`, `configs`, or `apps`, `<app_name>` and `<version>` represent the application name and version respectively, and `[Key=Value,...]` is optional buildArg parameters used only for the `dockerimages` type.

## Location of Image Configurations

You can place your configuration files in the `applications/<app_name>/<version>/` directory, including Dockerfiles, Kubefiles, and init.sh scripts, among others. The init.sh script is typically used for downloading dependencies such as Helm and kubectl-minio. You can choose to use either a Dockerfile or Kubefile to define your image build logic.

## Image Build Rules

The build rules vary slightly for each type of image. Generally, you need to create different subdirectories under the application directory and place different types of files in them, which Sealos will use to build the images. The specific rules are as follows:

1. `charts` directory: Place the Helm charts required for the cluster images. Kubernetes will scan the charts and fetch the images for building, and the registry directory will be placed at the same level as the Kubefile.
2. `manifests` directory: Place the Kubernetes yaml configurations directly. Kubernetes will scan all the images in the manifests directory and build the registry directory, which will be placed at the same level as the Kubefile.
3. `images/shim` directory: Store additional image lists and build the registry directory, which will be placed at the same level as the Kubefile.
4. If templates are required, place files with the `.tmpl` extension in `etc`, `charts`, or `manifests`. These files can be rendered by the `sealos run` command with environment variables and the `.tmpl` extension will be removed. For example, a file named `aa.yaml.tmpl` will be rendered as `aa.yaml`. Please ensure that the file names do not conflict with existing files.
5. The `registry` directory must be placed at the same level as the Kubefile. Otherwise, it will not be copied to the private repository of master0. Also, ensure that the registry is not stored in a chart, as it may cause slow scanning by Helm and potentially lead to OOM (out-of-memory) issues during image builds.
