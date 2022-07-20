# 构建一个 Ingress 集群镜像

这里展示了如何用 helm 构建一个 nginx-ingress 集群镜像。

## 下载 helm chart

```shell
$ mkdir ingress-nginx && cd ingress-nginx
$ helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
$ helm pull ingress-nginx/ingress-nginx
```

随后就能找到下载的 chart：

```shell
$ ls
ingress-nginx-4.1.0.tgz
```

## 添加镜像列表

Sealos 会下载镜像列表中的镜像并缓存到 registry 目录。

目录必须形如 `images/shim/[your image list filename]`：

```shell
$ cat images/shim/nginxImages
k8s.gcr.io/ingress-nginx/controller:v1.2.0
k8s.gcr.io/ingress-nginx/kube-webhook-certgen:v1.1.1
```

## 编写 Dockerfile

```Dockerfile
FROM scratch
COPY . .
CMD ["helm install ingress-nginx ingress-nginx-4.1.0.tgz --namespace ingress-nginx --create-namespace"]
```

## 构建镜像

```shell
$ sealos build -f Dockerfile -t docker.io/fanux/ingress-nginx:v1.2.0 .
```

## 推送到镜像 registry

```shell
$ sealos login docker.io
$ sealos push docker.io/fanux/ingress-nginx:v1.2.0
```
