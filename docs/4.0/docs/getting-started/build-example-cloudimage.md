---
sidebar_position: 5
---

# Build an ingress cluster image

Here is how to build an nginx-ingress cluster image with helm.

## Download helm chart

```shell
$ mkdir ingress-nginx && cd ingress-nginx
$ helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
$ helm pull ingress-nginx/ingress-nginx
```

Then you can find the download chart：

```shell
$ ls
ingress-nginx-4.1.0.tgz
```

## Add image list

sealos will download the images in the image list and cache them in the registry directory.

The directory must be of the form `images/shim/[your image list filename]`：

```shell
$ cat images/shim/nginxImages
k8s.gcr.io/ingress-nginx/controller:v1.2.0
k8s.gcr.io/ingress-nginx/kube-webhook-certgen:v1.1.1
```

## Write Dockerfile

```Dockerfile
FROM scratch
COPY ../examples .
CMD ["helm install ingress-nginx ingress-nginx-4.1.0.tgz --namespace ingress-nginx --create-namespace"]
```

## Build a cluster image

```shell
$ sealos build -f Dockerfile -t docker.io/fanux/ingress-nginx:v1.2.0 .
```

When sealos builds, it will automatically add the image dependencies in the image list to the cluster image, 
and save the dependent Docker images in a magical way. And when running in other environments, 
it will automatically detect whether there is a Docker image in the cluster. 
If there is, it will be downloaded automatically. 
If not, it will be downloaded from k8s.gcr.io. Users do not need to modify the docker image address in the helm chart. 
The black technology of image caching proxy is used here.

## Push to mirror registry

```shell
$ sealos login docker.io
$ sealos push docker.io/fanux/ingress-nginx:v1.2.0
```

## Run cluster image

```shell
$ sealos run docker.io/fanux/ingress-nginx:v1.2.0
```
