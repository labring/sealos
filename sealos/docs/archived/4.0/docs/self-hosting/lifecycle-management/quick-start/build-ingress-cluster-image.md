---
sidebar_position: 3
---

# Building an Ingress Cluster Image

Here we demonstrate how to build an nginx-ingress cluster image using Helm.

## Download the Helm Chart

```shell
$ mkdir ingress-nginx && cd ingress-nginx
$ helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
$ helm pull ingress-nginx/ingress-nginx
```

You will find the downloaded chart:

```shell
$ ls
ingress-nginx-4.1.0.tgz
```

## Add Image List

Sealos will download the images in the image list and cache them in the registry directory.

The directory must be in the format `images/shim/[your image list filename]`:

```shell
$ cat images/shim/nginxImages
k8s.gcr.io/ingress-nginx/controller:v1.2.0
k8s.gcr.io/ingress-nginx/kube-webhook-certgen:v1.1.1
```

## Write the Dockerfile

```Dockerfile
FROM scratch
COPY ../examples .
CMD ["helm install ingress-nginx ingress-nginx-4.1.0.tgz --namespace ingress-nginx --create-namespace"]
```

## Build the Cluster Image

```shell
$ sealos build -f Dockerfile -t docker.io/fanux/ingress-nginx:v1.2.0 .
```

Sealos will automatically add the image dependencies from the image list to the cluster image, magically saving the Docker images it depends on inside. When running in another environment, it will magically check if the Docker images exist in the cluster. If they do, it will automatically download them; otherwise, it will download them from k8s.gcr.io. Users do not need to modify the Docker image addresses in the Helm chart. This utilizes the black technology of image caching proxy.

## Push to the Image Registry

```shell
$ sealos login docker.io
$ sealos push docker.io/fanux/ingress-nginx:v1.2.0
```

## Run the Cluster Image

```shell
$ sealos run docker.io/fanux/ingress-nginx:v1.2.0
```
