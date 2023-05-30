# Build cloud image with yaml

Let's take the simplest nginx application as an example to introduce how to build a nginx cloud image.

Create a base directory as build workspace.

```shell
$ mkdir ~/cloud-images
```

Create a `manifests` directory to store kubernetes nginx deployment yaml file.

```shell
$ cd cloud-images
$ mkdir manifests
```

Prepare a simple [nginx kubernetes yaml](https://kubernetes.io/docs/tasks/run-application/run-stateless-application-deployment/#creating-and-exploring-an-nginx-deployment) file.

```shell
$ cat manifests/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 2
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.23.1
        ports:
        - containerPort: 80
```

Create a Kubefile for image build:

```shell
FROM scratch
COPY manifests manifests
COPY registry registry
CMD ["kubectl apply -f manifests/deployment.yaml"]
```

Build cloud image:

```
sealos build -t labring/nginx:v1.23.1 .
```

**Notes:**  You should install the sealos command to local host first.

You can view the build logs.

```shell
root@ubuntu:~/cloud-images# sealos build -t labring/nginx:v1.23.1 .
2022-11-06T15:12:14 info lookup in path charts
2022-11-06T15:12:14 info path charts is not exists, skip
2022-11-06T15:12:14 warn if you access private registry,you must be 'sealos login' or 'buildah login'
2022-11-06T15:12:14 info pull images [docker.io/library/nginx:1.23.1] for platform is linux/amd64
Pulling image: docker.io/library/nginx:1.23.1
51086ed63d8c: Download complete 
bd159e379b3b: Download complete 
6ab6a6301bde: Download complete 
98b0bbcc0ec6: Download complete 
8d634ce99fb9: Download complete 
f5d8edcd47b1: Download complete 
fe24ce36f968: Download complete 
Status: images save success
2022-11-06T15:12:27 info output images [docker.io/library/nginx:1.23.1] for platform is linux/amd64
STEP 1/4: FROM scratch
STEP 2/4: COPY manifests manifests
STEP 3/4: COPY registry registry
STEP 4/4: CMD ["kubectl apply -f manifests/deployment.yaml"]
COMMIT labring/nginx:v1.23.1
Getting image source signatures
Copying blob 54df88387b5b done  
Copying config 521c85942e done  
Writing manifest to image destination
Storing signatures
--> 521c85942ee
Successfully tagged labring/nginx:v1.23.1
521c85942ee488273193616ea79b4438611a93bb10fbfaa4d5381ceed13e744d
2022-11-06T15:12:28 info 
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

During the build process, sealos did the following:

- automatically extract docker images from the yaml files in the manifest directory, pull them locally, and store them in the registry directory.
- copy manifests to cloud images.
- copy registry to cloud images, docker images are pulled locally and stored in the registry.

The directory structure is as follows now:

```shell
.
├── Kubefile
├── manifests
│   └── deployment.yaml
└── registry
    └── docker
```

View the built image locally, now all dependent manifests and images are build into cloud image.

```shell
root@ubuntu:~/cloud-images# sealos images
labring/nginx                      v1.23.1          521c85942ee4   4 minutes ago   56.8 MB
```

You can push images to any Docker registry, the follow command push it to dockerhub.

```shell
sealos push labring/nginx:v1.23.1
```

**Notes:** please use the sealos command to operate cloud images, Docker command is not supported.

If you use a private image repository, just login registry with `sealos login` before pull or push images.

```shell
sealos login docker.io -u xxx -p xxx

sealos login registry.cn-hangzhou.aliyuncs.com -u xxx -p xxx
```
