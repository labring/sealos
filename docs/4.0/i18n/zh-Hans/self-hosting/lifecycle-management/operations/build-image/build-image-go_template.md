---
sidebar_position: 5
---

# 构建基于 go-template 的集群镜像

在构建集群镜像的过程中，我们可以使用 `--env` 选项通过sealos命令行传递一些变量。这些环境变量可以被Kubefile的 `CMD` 命令或者yaml文件模板所使用。

## 在 Kubefile 中使用环境变量

这个示例定义了一个 `SERVICE_TYPE` 变量，它允许用户在安装应用程序时自定义服务暴露类型，并将参数传递给CMD中的helm命令。

Kubefile 示例：

```shell
FROM scratch
ENV SERVICE_TYPE "NodePort"
COPY charts charts
COPY registry registry
CMD ["helm upgrade --install nginx charts/nginx --namespace=nginx --create-namespace --set service.type=$(SERVICE_TYPE)"]
```

运行集群应用并设置一个自定义的 `SERVICE_TYPE=LoadBalancer`，如果不设置，它将默认为 NodePort。

```shell
sealos run labring/nginx:v1.23.1 --env SERVICE_TYPE=LoadBalancer
```

## 在Yaml文件中使用环境变量

准备一个简单的nginx服务的yaml文件，这个文件必须是 `*.tmpl` 扩展名，以便在运行 `sealos run --env` 命令时渲染。

```shell
$ cat manifests/service.yaml.tmpl
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    name: nginx
spec:
  type: {{ .serviceType }}
  ports:
    - port: 80
      nodePort: {{ .http_NodePort }}
      name: http
    - port: 443
      nodePort: {{ .https_NodePort }}
      name: https
  selector:
    name: nginx
```

下面是一个Kubefile样例，你可以在这里设置默认的环境变量。

```shell
FROM scratch
ENV serviceType NodePort
ENV http_NodePort 30080
ENV https_NodePort 30443

COPY manifests manifests
COPY registry registry
CMD ["kubectl apply -f manifests/service.yaml"]
```

当你构建镜像时，什么都不会发生，只有在运行应用程序时，它才会渲染。如果没有设置 `--env`，它将使用 Kubefile 的默认 ENV。

```shell
sealos run labring/nginx:1.23.1 --env serviceType=LoadBalancer --env http_NodePort=30080 --env https_NodePort=30443
```

你会发现 sealos 会在主节点的本地路径上基于 `service.yaml.tmpl` 渲染一个新的yaml文件 `service.yaml`。

**注意** 新版本的应用的rootfs放到了`/var/lib/sealos/data/default/applications`目录，每个应用都有独立的目录。

```shell
root@node1:~# ls /var/lib/sealos/data/default/rootfs/manifests |grep service
service.yaml
service.yaml.tmpl
```

检查 yaml 内容：

```shell
root@node1:~# cat /var/lib/sealos/data/default/rootfs/manifests/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    name: nginx
spec:
  type: NodePort
  ports:
    - port: 80
      nodePort: 30080
      name: http
    - port: 443
      nodePort: 30443
      name: https
  selector:
    name: nginx
```

**注意：**所有类型的文件都支持这个特性（文件名后缀是.tmpl且构建目录在etc、scripts和manifests），你可以自己尝试一下。
