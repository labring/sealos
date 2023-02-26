---
sidebar_position: 2
---

# How to use sealos private registry

## How it works

Each node will run an image-cri-shim daemon,The Kubelet performs grpc interaction with image-cri-shim when pulling the image.It finds the image in the private registry according to the image name.If the image exist it pulls from local,otherwise pull from remote.

You can run the follow command verify the image-cri-shim daemon:

```shell
$ systemctl status image-cri-shim.service 
```

## Where the private registry running

The sealos private registry runs on the first node of the cluster，The first node of the cluster is where you run the create cluster command, you can see this systemd service `registry.service ` with the following command.

```shell
$ systemctl status registry.service
```

**Notes:** The data of the registry is saved in ` /var/lib/sealos/data/default/rootfs/registry` directory.

## Manage registry with sealos

Login registry

```
$ sealos login -u admin -p passw0rd sealos.hub:5000
```

Pull image

```
$ sealos pull docker.io/library/nginx:1.23.3
```

Retag image

```
$ sealos tag docker.io/library/nginx:1.23.3 sealos.hub:5000/library/nginx:1.23.3
```

Push image

```
$ sealos push sealos.hub:5000/library/nginx:1.23.3
```

## Manage registry with docker

Sealos private registry runs with HTTP，You should configure insecure-registries at local，Example of docker client config.

```json
$ cat /etc/docker/daemon.json 
{
  "insecure-registries": ["sealos.hub:5000"]
}
```

Restart docker to reload config

```
$ systemctl daemon-reload && systemctl restart docker
```

Configure local domain name resolution, and `192.168.1.30` is the first node's IP address of kubernetes cluster.

```shell
$ cat /etc/hosts
...
192.168.1.30 sealos.hub
```

Login with `docker login` command, the default username and password is `admin:passw0rd`.

```shell
$ docker login -u admin -p passw0rd sealos.hub:5000
```

## Manage registry with containerd

The containerd-based cluster has `ctr` and `crictl` commands installed by default, but neither of them is very easy to use.

1. **ctr command**

```shell
ctr images pull --all-platforms docker.io/library/nginx:1.23.3
ctr images tag docker.io/library/nginx:1.23.3 sealos.hub:5000/library/nginx:1.23.3
ctr images push --plain-http --user admin:passw0rd sealos.hub:5000/library/nginx:1.23.3
```

Export image from default namespace

```
ctr -n default images ls
ctr images export --all-platforms nginx_1.23.3.tar.gz docker.io/library/nginx:1.23.3
```

Import images to k8s.io namespace

```shell
ctr -n k8s.io images import --all-platforms nginx_1.23.3.tar.gz
ctr -n k8s.io images ls |grep nginx
```

**Notes:** To get the image when running the kubectl apply command, you must upload the image to the `k8s.io` namespace.

2. **nerdctl comamnd**

Or you can install nerdctl，`nerdctl` is a Docker-compatible CLI for containerd， but the cluster installed by sealos does not contain the nerdctl command by default.

```shell
wget https://github.com/containerd/nerdctl/releases/download/v1.2.0/nerdctl-1.2.0-linux-amd64.tar.gz
tar -zxvf nerdctl-1.2.0-linux-amd64.tar.gz nerdctl && mv nerdctl /usr/local/bin
```

Then you can use nerdctl manage images

```
nerdctl login -u admin -p passw0rd sealos.hub:5000
nerdctl pull docker.io/library/nginx:1.23.3
nerdctl tag docker.io/library/nginx:1.23.3 sealos.hub:5000/library/nginx:1.23.3
nerdctl push sealos.hub:5000/library/nginx:1.23.3
```

To get the image when running the kubectl apply command, nerdctl also need upload the image to the `k8s.io` namespace.

```
nerdctl -n k8s.io load -i nginx_1.23.3.tar.gz 
```

Notes:

- `ctr` and `nerdctl` command belongs to containerd.
- `crictl` command belongs to  kubernetes, but it does not support tag image and login registry, only support pull and push.

## Manage registry with sealctl

Login registry

```
$ sealctl login -u admin -p passw0rd sealos.hub:5000
```

Check registry status

```
$ sealctl registry status
+-----------------+------------------------+----------+----------+---------+
| Name            | URL                    | UserName | Password | Healthy |
+-----------------+------------------------+----------+----------+---------+
| sealos.hub:5000 | http://sealos.hub:5000 | admin    | passw0rd | ok      |
+-----------------+------------------------+----------+----------+---------+
```

List all images in registry

```
root@node1:~# sealctl registry images
```

More command

```
sealctl --help
```

## Push images to private registry

Only retag the registry  url and other parts remain unchanged, eg:

```
docker.io/library/nginx:1.23.3  -->  sealos.hub:5000/library/nginx:1.23.3
```

Example:

```shell
$ docker tag docker.io/library/nginx:1.23.3 sealos.hub:5000/library/nginx:1.23.3

$ docker push sealos.hub:5000/library/nginx:1.23.3
Using default tag: latest
The push refers to repository [sealos.hub:5000/library/nginx/1.23.3]
a98b3d943f46: Pushed 
b48290351261: Pushed 
f39ec3c22bd5: Pushed 
e5a31cf70f11: Pushed 
b9394289d761: Pushed 
c550c8e0f355: Pushed 
latest: digest: sha256:238efd85942755fbd28d4d23d1f8dedd99e9eec20777e946f132633b826a9295 size: 1570
```

## Run pods use private registry image

Create a deployment yaml

```yaml
$ cat nginx-app.yaml
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
        image: docker.io/library/nginx:1.23.3
        ports:
        - containerPort: 80
```

Apply the yaml

```shell
$ kubectl apply -f nginx-app.yaml
```

Image-cri-shim service will first redirect the pull request to sealos.hub, If no image is found in sealos.hub, the image will be pulled from the Internet.
