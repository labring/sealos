# Building an Example CloudImage

This is an example for building an nginx-ingress CloudImage using helm.

## Download helm chart

```shell
$ mkdir ingress-nginx && cd ingress-nginx
$ helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
$ helm pull ingress-nginx/ingress-nginx
```

Then you will got the chart:

```shell
$ ls
ingress-nginx-4.1.0.tgz
```

## Add image list

Sealos will download images in image list, and cache it into registry dir.

The dir must be `images/shim/[your image list filename]`:

```shell
$ cat images/shim/nginxImages
k8s.gcr.io/ingress-nginx/controller:v1.2.0
k8s.gcr.io/ingress-nginx/kube-webhook-certgen:v1.1.1
```

## Add a Dockerfile

```Dockerfile
FROM scratch
COPY . .
CMD ["helm install ingress-nginx ingress-nginx-4.1.0.tgz --namespace ingress-nginx --create-namespace"]
```

## Build

```shell
$ sealos build -f Dockerfile -t docker.io/fanux/ingress-nginx:v1.2.0 .
```

## Push to registry

```shell
$ sealos login docker.io
$ sealos push docker.io/fanux/ingress-nginx:v1.2.0
```
