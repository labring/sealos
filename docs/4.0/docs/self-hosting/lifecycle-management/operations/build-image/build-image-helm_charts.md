---
sidebar_position: 3
---

# Building Cluster Images Based on Helm Charts

Let's use the simplest nginx application as an example to introduce how to build a cluster image based on nginx using Helm Charts.

## 1. Preparation

Create a base directory for the build work.

```shell
$ mkdir ~/cloud-images
```

Create a `charts` directory to store the Kubernetes nginx Helm Charts files.

```shell
$ cd cloud-images
$ mkdir charts
```

## 2. Prepare Helm Charts

Prepare the nginx Helm Charts. Here we use [the official nginx Helm Charts by bitnami](https://bitnami.com/stack/nginx). Let's pull the Helm Chart files locally and unzip them to the `charts` directory.

```shell
helm repo add bitnami https://charts.bitnami.com/bitnami
helm search repo bitnami/nginx
helm pull bitnami/nginx --version=13.2.13 -d charts/ --untar
```

**Note:** First, you should install the Helm command tool to your local host.

Now, the structure of the charts directory is as follows:

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

## 3. Create Kubefile

Create a file named `Kubefile` for image construction:

```shell
$ cat Kubefile
FROM scratch
COPY charts charts
COPY registry registry
CMD ["helm install nginx charts/nginx --namespace=nginx --create-namespace"]
```

It is recommended to use `helm upgrade --install` instead of `helm install` so that you can rerun the same command when updating the application in the future.

You can add other options as needed, such as exposing the service through NodePort.

```shell
FROM scratch
COPY charts charts
COPY registry registry
CMD ["helm upgrade --install nginx charts/nginx --namespace=nginx --create-namespace --set service.type=NodePort"]
```

## 4. Build the Cluster Image

Now everything is ready, and you can start building the cluster image.

```shell
sealos build -t labring/nginx:v1.23.2 .
```

**Note:** You should first install the sealos command to your local host.

You can view the build log.

```shell
root@ubuntu:~/cloud-images# sealos build -t labring/nginx:v1.23.2 .
...
```

sealos will automatically extract the images from the charts directory, pull them locally, and store them in the registry directory.

The current directory structure is as follows:

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

Check the built image locally. Now all dependent deployment manifests and image caches are built into the cluster image.

```shell
root@ubuntu:~/cloud-images# sealos images
labring/nginx                      v1.23.2          521c85942ee4   4 minutes ago   56.8 MB
```

You can push the image to any Docker image repository. The following command pushes it to Docker Hub.

```shell
sealos push labring/nginx:v1.23.2
```

**Note:** Please use the sealos command to operate the cluster

image, Docker commands are not supported.

If you use a private image repository, just use the `sealos login` command to log in to the registry before pulling or pushing the image.

```shell
sealos login docker.io -u xxx -p xxx

sealos login registry.cn-hangzhou.aliyuncs.com -u xxx -p xxx
```

## 5. Install the Cluster Image

Then, you can run the cluster image in your cluster.

```shell
sealos run labring/nginx:v1.23.2
```

The helm binary command will be installed on the master node of your Kubernetes cluster.

```shell
root@ubuntu:~# helm -n nginx ls
```

## 6. Explanation

By default, when building images, sealos only parses the default values.yml file. However, you can also provide a custom values.yaml file for sealos.

**The custom values file must be placed in the same directory as your Chart, and must be named in the form of `<chart-name>.values.yaml`, for example `loki-stack.values.yaml`.**

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

The content of `loki-stack.values.yaml` file is as follows:

```shell
$ cat charts/loki-stack.values.yaml
promtail:
  enabled: false
fluent-bit:
  enabled: true
grafana:
  enabled: true
```

Different values files may output different image lists, allowing sealos to automatically parse the images during the `sealos build` process.

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
