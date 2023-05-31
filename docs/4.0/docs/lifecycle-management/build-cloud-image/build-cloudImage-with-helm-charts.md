# Build cloud image with helm charts

Let's still take the simplest nginx application as an example to introduce how to build an nginx cloud image based on hem charts.

Create a base directory for build work.

```shell
$ mkdir ~/cloud-images
```

Create a `charts` directory to store kubernetes nginx helm charts file.

```shell
$ cd cloud-images
$ mkdir charts
```

Prepare the nginx helm charts,Here we use [bitnami official nginx helm charts](https://bitnami.com/stack/nginx), let's pull the helm chart file to local and untar it to`charts` directory.

```shell
helm repo add bitnami https://charts.bitnami.com/bitnami
helm search repo bitnami/nginx
helm pull bitnami/nginx --version=13.2.13 -d charts/ --untar
```

**Notes:** you should install helm command tool to local host first.

Now the charts directory as follow.

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

Create a file named `Kubefile` for image build:

```shell
$ cat Kubefile
FROM scratch
COPY charts charts
COPY registry registry
CMD ["helm install nginx charts/nginx --namespace=nginx --create-namespace"]
```

Suggest use `helm upgrade --install` instead of `helm install`, This allows you to run the same command repeatedly to update the application later.

And You can add other options as you like, such as exposing services through the nodeport.

```shell
FROM scratch
COPY charts charts
COPY registry registry
CMD ["helm upgrade --install nginx charts/nginx --namespace=nginx --create-namespace --set service.type=NodePort"]
```

Now everything is ready, you can start to build the cloud image.

```shell
sealos build -t labring/nginx:v1.23.2 .
```

**Notes:**  You should install the sealos command to local host first.

You can view the build logs.

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

sealos will automatically extract images from charts directory, pull them locally, and store them in the registry directory.

The directory structure is as follows now:

```shell
.
├── charts
│   └── nginx
│       ├── Chart.lock
│       ├── charts
│       ├── Chart.yaml
│       ├── README.md
│       ├── templates
│       ├── values.schema.json
│       └── values.yaml
├── Kubefile
└── registry
    └── docker
        └── registry
```

View the built image locally, now all dependent manifests and images are build into cloud image.

```shell
root@ubuntu:~/cloud-images# sealos images
labring/nginx                      v1.23.2          521c85942ee4   4 minutes ago   56.8 MB
```

You can push images to any Docker registry, the follow command push it to dockerhub.

```shell
sealos push labring/nginx:v1.23.2
```

**Notes:** please use the sealos command to operate cloud images, Docker command is not supported.

If you use a private image repository, just login registry with `sealos login` before pull or push images.

```shell
sealos login docker.io -u xxx -p xxx

sealos login registry.cn-hangzhou.aliyuncs.com -u xxx -p xxx
```

## Install cloud image

Then you can run cloud image in your cluster.

```shell
sealos run labring/nginx:v1.23.2
```

The helm binary command will installed to your master nodes of your kubernetes cluster.

```shell
root@ubuntu:~# helm -n nginx ls
```

## Custom values.yaml

By default, when building an image, sealos only parses the default values.yml, However, you can also provide a custom values.yaml for sealos.

The custom values file must put in the same directory as your chart, and must named with form like `<chart-name>.values.yaml`, e.g., `loki-stack.values.yaml`.

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

The `loki-stack.values.yaml` like this:

```shell
$ cat charts/loki-stack.values.yaml
promtail:
  enabled: false
fluent-bit:
  enabled: true
grafana:
  enabled: true
```

Different values files may be output to a different list of images to enable sealos to automatically parses the images during `sealos build`.

```shell
$ helm template charts/loki-stack/ -f charts/loki-stack/values.yaml|grep image: 
          image: "grafana/promtail:2.0.0"
          image: "grafana/loki:2.0.0"
          image: bats/bats:v1.1.0

$ helm template charts/loki-stack/ -f charts/loki-stack.values.yaml|grep image: 
          image: "grafana/fluent-bit-plugin-loki:1.6.0-amd64"
          image: "kiwigrid/k8s-sidecar:0.1.209"
          image: "grafana/grafana:6.7.0"
          image: "grafana/loki:2.0.0"
          image: "bats/bats:v1.1.0"
          image: bats/bats:v1.1.0
```
