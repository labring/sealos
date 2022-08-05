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

sealos will automatically download images parsed from those locations, and cache them into `registry` dir:

- `images/shim/$images_file`
- `manifests/*.yaml`
- manifests rendered from chart in `charts/` directory, chart directory and chart tar file are both supported

for example:

```shell
$ cat images/shim/nginxImages
k8s.gcr.io/ingress-nginx/controller:v1.2.0
k8s.gcr.io/ingress-nginx/kube-webhook-certgen:v1.1.1
$ tree
ingress-nginx
|-- Dockerfile
|-- charts
|   |-- ingress-nginx-4.1.0.tgz
|   `-- ingress-nginx.values.yaml
```

if custom values file named with form `$chartName.values.yaml` exists, manifests will rendered with custom values, just like `helm template -f $chartName.values.yaml ...`.

## Add a Dockerfile

```Dockerfile
FROM scratch
COPY . .
CMD ["helm install ingress-nginx charts/ingress-nginx-4.1.0.tgz --namespace ingress-nginx --create-namespace -f charts/ingress-nginx.values.yaml"]
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
