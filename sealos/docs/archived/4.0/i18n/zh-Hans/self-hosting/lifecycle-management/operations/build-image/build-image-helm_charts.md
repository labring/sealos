---
sidebar_position: 3
---

# 构建基于 Helm Charts 的集群镜像

让我们以最简单的 nginx 应用程序为例，介绍如何基于 Helm Charts 构建一个基于 nginx 的集群镜像。

## 一、准备工作

创建一个用于构建工作的基础目录。

```shell
$ mkdir ~/cloud-images
```

创建一个 `charts` 目录来存储 Kubernetes nginx Helm Charts 文件。

```shell
$ cd cloud-images
$ mkdir charts
```

## 二、准备Helm Charts

准备 nginx Helm Charts，这里我们使用 [bitnami 官方的 nginx Helm Charts](https://bitnami.com/stack/nginx)，让我们将 Helm Chart 文件拉取到本地并解压到 `charts` 目录中。

```shell
helm repo add bitnami https://charts.bitnami.com/bitnami
helm search repo bitnami/nginx
helm pull bitnami/nginx --version=13.2.13 -d charts/ --untar
```

**注意：** 首先你应该安装 Helm 命令工具到本地主机。

现在，charts 目录的结构如下所示。

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

## 三、创建Kubefile

创建一个名为 `Kubefile` 的文件用于镜像构建：

```shell
$ cat Kubefile
FROM scratch
COPY charts charts
COPY registry registry
CMD ["helm install nginx charts/nginx --namespace=nginx --create-namespace"]
```

建议使用 `helm upgrade --install` 而不是 `helm install`，这样可以在以后更新应用程序时重复运行相同的命令。

你可以根据需要添加其他选项，例如通过 NodePort 暴露服务。

```shell
FROM scratch
COPY charts charts
COPY registry registry
CMD ["helm upgrade --install nginx charts/nginx --namespace=nginx --create-namespace --set service.type=NodePort"]
```

## 四、构建集群镜像

现在一切准备就绪，你可以开始构建集群镜像。

```shell
sealos build -t labring/nginx:v1.23.2 .
```

**注意：** 你应该首先将 sealos 命令安装到本地主机。

你可以查看构建日志。

```shell
root@ubuntu:~/cloud-images# sealos build -t labring/nginx:v1.23.2 .
2022-11-06T15:58:33 info lookup in path charts
2022-11-06T15:58:33 info sub chart is nginx
2022-11-06T15:58:33 warn if you access private registry,you must be 'sealos login' or 'buildah login'
2022-11-06T15:58:33 info pull images [docker.io/bitnami/nginx:1.23.2-debian-11-r29] for platform is linux/amd64
Pulling image: docker.io/bitnami/nginx:1.23.2-debian-11-r29
1d8866550bdd: Download complete 
cbbfe6232a5b: Download complete 
ed342369e859: Download complete 
Status: images save success
2022-11-06T15:58:43 info output images [docker.io/bitnami/nginx:1.23.2-debian-11-r29] for platform is linux/amd64
STEP 1/3: FROM scratch
STEP 2/3: COPY . .
STEP 3/3: CMD ["helm upgrade --install nginx charts/nginx --namespace=nginx --create-namespace --set service.type=NodePort"]
COMMIT labring/nginx:v1.23.2
Getting image source signatures
Copying blob 9f5a861e0f8d done  
Copying config 1b89695273 done  
Writing manifest to image destination
Storing signatures
--> 1b896952734
Successfully tagged localhost/labring/nginx:v1.23.2
1b8969527343939d60859469708e5420758f7419a421304f81b5132669982de7
2022-11-06T15:58:44 info 
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

sealos 将自动从 charts 目录中提取镜像，将其拉取到本地并存储在 registry 目录中。

现在的目录结构如下所示：

```shell
.
├── charts
│   └── nginx
│       ├── Chart.lock
│       ├── charts
│       ├── Chart.yaml
│       ├── README.md
│       ├── templates
│       ├── values.schema.json
│       └── values.yaml
├── Kubefile
└── registry
    └── docker
        └── registry
```

在本地查看构建的镜像，现在所有依赖的部署清单和镜像缓存都构建到了集群镜像中。

```shell
root@ubuntu:~/cloud-images#

 sealos images
labring/nginx                      v1.23.2          521c85942ee4   4 minutes ago   56.8 MB
```

你可以将镜像推送到任何 Docker 镜像仓库，下面的命令将其推送到 Docker Hub。

```shell
sealos push labring/nginx:v1.23.2
```

**注意：** 请使用 sealos 命令操作集群镜像，不支持 Docker 命令。

如果你使用私有镜像仓库，只需在拉取或推送镜像之前使用 `sealos login` 命令登录到注册表。

```shell
sealos login docker.io -u xxx -p xxx

sealos login registry.cn-hangzhou.aliyuncs.com -u xxx -p xxx
```

## 五、安装集群镜像

然后你可以在你的集群中运行集群镜像。

```shell
sealos run labring/nginx:v1.23.2
```

helm 二进制命令将安装到你的 Kubernetes 集群的主节点上。

```shell
root@ubuntu:~# helm -n nginx ls
```

## 六、说明

默认情况下，在构建镜像时，sealos 只解析默认的 values.yml 文件，但是你也可以为 sealos 提供自定义的 values.yaml 文件。

**自定义 values 文件必须放在与你的 Chart 相同的目录中，并且必须以 `<chart-name>.values.yaml` 的形式命名，例如 `loki-stack.values.yaml`。**

```shell
.
├── charts
│   ├── loki-stack
│   │   ├── charts
│   │   ├── Chart.yaml
│   │   ├── README.md
│   │   ├── requirements.lock
│   │   ├── requirements.yaml
│   │   ├── templates
│   │   └── values.yaml
│   └── loki-stack.values.yaml
├── init.sh
├── Kubefile
```

`loki-stack.values.yaml` 文件内容如下：

```shell
$ cat charts/loki-stack.values.yaml
promtail:
  enabled: false
fluent-bit:
  enabled: true
grafana:
  enabled: true
```

不同的 values 文件可能会输出不同的镜像列表，以使 sealos 能够在 `sealos build` 过程中自动解析镜像。

```shell
$ helm template charts/loki-stack/ -f charts/loki-stack/values.yaml|grep image: 
          image: "grafana/promtail:2.0.0"
          image: "grafana/loki:2.0.0"
          image: "bats/bats:v1.1.0"

$ helm template charts/loki-stack/ -f charts/loki-stack.values.yaml|grep image: 
          image: "grafana/fluent-bit-plugin-loki:1.6.0-amd64"
          image: "kiwigrid/k8s-sidecar:0.1.209"
          image: "grafana/grafana:6.7.0"
          image: "grafana/loki:2.0.0"
          image: "bats/bats:v1.1.0"
          image: bats/bats:v1.1.0
```
