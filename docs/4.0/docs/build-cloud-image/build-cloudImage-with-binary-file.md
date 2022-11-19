# Build cloud image with binary file

Command line tools such as helm or kustomize are single binary files. We can package them into cloud images, and then install them by deploying cloud images on the master node.Let's take helm as an example to introduce how to package binary files into cloud image.

Create a base directory as build workspace.

```shell
$ mkdir ~/cloud-images
```

Create an `opt` directory to store binary file.

```shell
$ cd cloud-images
$ mkdir opt/
```

Prepare the helm binary file,Here we download it from [github release](https://github.com/helm/helm/releases).

```shell
wget https://get.helm.sh/helm-v3.10.1-linux-amd64.tar.gz
tar -zxvf helm-v3.10.1-linux-amd64.tar.gz
chmod a+x linux-amd64/helm
mv linux-amd64/helm opt/
```

**Notes:** you should install helm command tool to local host first.

Now the `charts` directory as follow.

```
charts/
└── nginx
    ├── Chart.lock
    ├── charts
    ├── Chart.yaml
    ├── README.md
    ├── templates
    ├── values.schema.json
    └── values.yaml
```

Create a Kubefile for image build:

```shell
FROM scratch
COPY opt ./opt
CMD ["cp opt/helm /usr/bin/"]
```

Now everything is ready, you can start to build the cloud image.

```shell
sealos build -t labring/helm:v3.10.1 .
```

**Notes:**  You should install the sealos command to local host first.

You can view the build logs.

```shell
root@ubuntu:~/cloud-images# sealos build -t labring/helm:v3.10.1 .
2022-11-06T16:17:38 info lookup in path charts
2022-11-06T16:17:38 info path charts is not exists, skip
2022-11-06T16:17:38 warn if you access private registry,you must be 'sealos login' or 'buildah login'
2022-11-06T16:17:38 info pull images [] for platform is linux/amd64
2022-11-06T16:17:38 info output images [] for platform is linux/amd64
STEP 1/3: FROM scratch
STEP 2/3: COPY opt ./opt
STEP 3/3: CMD ["cp opt/helm /usr/bin/"]
COMMIT labring/helm:v3.10.1
Getting image source signatures
Copying blob f30936773f80 done  
Copying config 19ed4a24f0 done  
Writing manifest to image destination
Storing signatures
--> 19ed4a24f0f
Successfully tagged labring/helm:v3.10.1
19ed4a24f0fe1d7ba18770195aa61f2191b9f45e7ab6bf929768cacea47375c5
2022-11-06T16:17:39 info 
      ___           ___           ___           ___       ___           ___
     /\  \         /\  \         /\  \         /\__\     /\  \         /\  \
    /::\  \       /::\  \       /::\  \       /:/  /    /::\  \       /::\  \
   /:/\ \  \     /:/\:\  \     /:/\:\  \     /:/  /    /:/\:\  \     /:/\ \  \
  _\:\~\ \  \   /::\~\:\  \   /::\~\:\  \   /:/  /    /:/  \:\  \   _\:\~\ \  \
 /\ \:\ \ \__\ /:/\:\ \:\__\ /:/\:\ \:\__\ /:/__/    /:/__/ \:\__\ /\ \:\ \ \__\
 \:\ \:\ \/__/ \:\~\:\ \/__/ \/__\:\/:/  / \:\  \    \:\  \ /:/  / \:\ \:\ \/__/
  \:\ \:\__\    \:\ \:\__\        \::/  /   \:\  \    \:\  /:/  /   \:\ \:\__\
   \:\/:/  /     \:\ \/__/        /:/  /     \:\  \    \:\/:/  /     \:\/:/  /
    \::/  /       \:\__\         /:/  /       \:\__\    \::/  /       \::/  /
     \/__/         \/__/         \/__/         \/__/     \/__/         \/__/

                  Website :https://www.sealos.io/
                  Address :github.com/labring/sealos
```

The directory structure is as follows now:

```shell
.
├── Kubefile
└── opt
    └── helm
```

View the built image locally, now all dependent manifests and images are build into cloud image.

```shell
root@ubuntu:~/cloud-images# sealos images
labring/helm                      v3.10.1          19ed4a24f0fe   3 minutes ago       45.1 MB
```

You can push images to any Docker registry, the follow command push it to dockerhub.

```shell
sealos push labring/helm:v3.10.1
```

**Notes:** please use the sealos command to operate cloud images, Docker command is not supported.

If you use a private image repository, just login registry with `sealos login` before pull or push images.

```shell
sealos login docker.io -u xxx -p xxx

sealos login registry.cn-hangzhou.aliyuncs.com -u xxx -p xxx
```