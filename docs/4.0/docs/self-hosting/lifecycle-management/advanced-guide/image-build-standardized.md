---
sidebar_position: 1
---

# Image Building and Standard Directory Configuration

Before embarking on Sealos image building tasks, we suggest first constructing a directory structure that conforms to standards. This makes the building process more standardized, easier to manage, and reduces the likelihood of errors. This article will guide you in detail on how to create such a directory structure and explain the purpose of each directory.

## Directory Structure Example

A complete, standardized directory structure example is as follows:

```shell
.
├── charts
│   └── nginx
│       ├── Chart.lock
│       ├── charts
│       ├── Chart.yaml
│       ├── README.md
│       ├── templates
│       ├── values.schema.json
│       └── values.yaml
├── images
│   └── shim
│       └── nginxImages
├── init.sh
├── Kubefile
├── manifests
│   └── nginx
│       ├── deployment.yaml
│       ├── ingress.yaml
│       └── service.yaml
├── opt
│   └── helm
└── registry
```

## Directory Descriptions

Each directory plays a specific role during the build process, and their detailed descriptions are as follows:

- `Kubefile` (required): This file is similar to Dockerfile and is the core file for image building. It defines various steps in the build process, such as the selection of the base image, setting of environment variables, file copying, etc.
- `manifests`: This directory is used to store Kubernetes yaml files, which describe the configuration information of your applications, such as Pod, Service, Deployment configurations.
- `charts`: This directory is used to store Helm chart files. Helm chart is a package management tool for Kubernetes that simplifies the deployment and management of Kubernetes applications.
- `images/shim`: This directory is used to store images that cannot be automatically extracted from yaml files or Helm charts. During the build process, sealos will automatically pull these images.
- `opt`: Binary files are stored here.
- `registry`: This directory is used to store images pulled locally during the build process. During the build process, this directory will be automatically generated, and there is no need to manually create it.
- `init.sh`: This script is automatically run by GitHub Action during the build process. You can write some automated tasks in this script, such as initializing the environment, preprocessing data, etc. (Following the rules of [cluster-image](https://github.com/labring-actions/cluster-image))

## Kubefile Parameters

The `Kubefile` file is at the core of image building and supports various parameters. Below is a detailed analysis of these parameters:

```shell
FROM labring/kubernetes:v1.24.0
ENV version v1.1.0
COPY manifests ./manifests
COPY registry ./registry
ENTRYPOINT ["kubectl apply -f manifests/tigera-operator.yaml"]
CMD ["kubectl apply -f manifests/custom-resources.yaml"]
```

Descriptions of each parameter:

- `FROM`: This directive is used to set the base image for building. All build steps are based on this image.
- `LABEL`: `LABEL` defines some internal configurations of the sealos cluster image.
  - `check`: Some check scripts operation before the cluster image runs.
  - `clean`: Cleanup scripts for cluster reset or node deletion.
  - `clean-registry`: The script to clean the image repository when the cluster is reset.
  - `image`: The lvscare image address of the cluster (Sealos's IPVS image).
  - `init`: Cluster initialization script.


- `init-registry`: The script to start the container image repository when initializing the cluster.
  - `sealos.io.type`: Cluster image type, currently mainly rootfs, application, and patch.
    - Rootfs is the basic image for running the cluster, such as Kubernetes, Kubernetes-docker, which includes images, binaries, etc. required by the cluster (**required for each node**).
    - Application is the application image, such as calico, helm, istio, etc. application service images. (**only stored on the master0 node**)
    - Patch is needed to adjust after the rootfs image. It is another way to modify the rootfs image (**another method is the Config method**), it will overwrite the first image of the default cluster running.
  - `sealos.io.version`: The version number of the image, currently the opened version is v1beta1.
  - `version`: The version number of the cluster, currently it's the version number of Kubernetes.
  - `vip`: It's the VIP address for modifying the IPVS virtual IP.
- `ENV`: The `ENV` directive sets the environment variable `<key>` to the value `<value>`. (There will be some default environment variables in rootfs, which can modify some default parameters in rootfs, such as the username and password of the image repository, the storage directory of docker, containerd, etc.)

  For specific cluster images, you need to inspect it specifically, check the corresponding environment variables with `sealos inspect` image, different versions of the image have slight differences.
  - SEALOS_SYS_CRI_ENDPOINT: The criSocket of the current cluster image (different types of cluster images may be different).
  - criData: Data directory of cri.
  - defaultVIP: Default VIP address.
  - disableApparmor: Whether to disable apparmor (containerd has this issue).
  - registryConfig: Configuration directory of the container image repository.
  - registryData: Data directory of the container image repository (because it's the directory that has been mounted, this configuration actually has no practical significance, it's actually stored under /var/lib/sealos).
  - registryDomain: The default domain of the image repository.
  - registryPassword: The password of the default image repository.
  - registryPort: The password of the default image repository.
  - registryUsername: The account of the default image repository.
  - sandboxImage: Default sandbox_image for cri to start. (No need to write repo, just need to write image name, eg: pasue:3.7).
- `COPY`: The `COPY` directive copies new files or directories from `<src>` and adds them to the file system path `<dest>` on the container. (**Note that the registry directory needs to be copied, otherwise the cluster has no container images**)
- `ENTRYPOINT`: This directive is used to set the startup command for the image. When the image starts, this command will be executed.
- `CMD`: This directive is also used to set the startup command for the image. However, the difference between it and the ENTRYPOINT directive is that if users provide a startup command when running the image (`sealos run --cmd`), the command in the CMD directive will be overridden.

During the build process, Sealos will also automatically set some built-in environment variables, including (environment variables with the prefix 'SEALOS_SYS' cannot be modified):

- SEALOS_SYS_KUBE_VERSION: The version number of Kubernetes, for example v1.26.0
- SEALOS_SYS_SEALOS_VERSION: The version number of Sealos, for example 4.1.3.
