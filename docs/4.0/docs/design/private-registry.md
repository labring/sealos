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

Retag image, suggest only retag the registry  url and other parts remain unchanged, eg:

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

3. **nerdctl build**

If you want to use nerdctl to build an image, you need more steps, and you need to install buildkit.

```shell
wget https://github.com/moby/buildkit/releases/download/v0.11.3/buildkit-v0.11.3.linux-amd64.tar.gz
tar -zxvf buildkit-v0.11.3.linux-amd64.tar.gz -C /usr/local/bin --strip=1
```

Add buildkit.service

```shell
cat >/etc/systemd/system/buildkit.service<<EOF
[Unit]
Description=BuildKit
Requires=buildkit.socket
After=buildkit.socket
Documentation=https://github.com/moby/buildkit

[Service]
Type=notify
ExecStart=/usr/local/bin/buildkitd --addr fd://

[Install]
WantedBy=multi-user.target
EOF
```

Add buildkit.socket

```shell
cat >/etc/systemd/system/buildkit.socket<<EOF
[Unit]
Description=BuildKit
Documentation=https://github.com/moby/buildkit

[Socket]
ListenStream=%t/buildkit/buildkitd.sock
SocketMode=0660

[Install]
WantedBy=sockets.target
EOF
```

Start buildkit service

```shell
systemctl enable --now buildkit
```

Create a Dockerfile and build image with nerdctl

```shell
root@node1:~/tmp# nerdctl build -t sealos.hub:5000/library/ubuntu:22.04 .
[+] Building 188.2s (6/6)                                                                                                                                                                   
[+] Building 188.3s (6/6) FINISHED                                                                                                                                                          
 => [internal] load build definition from Dockerfile                                                                                                                                   0.1s
 => => transferring dockerfile: 101B                                                                                                                                                   0.0s
 => [internal] load .dockerignore                                                                                                                                                      0.1s
 => => transferring context: 2B                                                                                                                                                        0.0s
 => [internal] load metadata for docker.io/library/ubuntu:22.04                                                                                                                        3.6s
 => [1/2] FROM docker.io/library/ubuntu:22.04@sha256:9a0bdde4188b896a372804be2384015e90e3f84906b750c1a53539b585fbbe7f                                                                156.4s
 => => resolve docker.io/library/ubuntu:22.04@sha256:9a0bdde4188b896a372804be2384015e90e3f84906b750c1a53539b585fbbe7f                                                                  0.0s
 => => sha256:677076032cca0a2362d25cf3660072e738d1b96fe860409a33ce901d695d7ee8 29.53MB / 29.53MB                                                                                     154.8s
 => => extracting sha256:677076032cca0a2362d25cf3660072e738d1b96fe860409a33ce901d695d7ee8                                                                                              1.5s
 => [2/2] RUN apt update -y -q && apt install -y -q vim                                                                                                                               20.8s
 => exporting to docker image format                                                                                                                                                   7.2s
 => => exporting layers                                                                                                                                                                5.3s 
 => => exporting manifest sha256:7719df8c3f4082d4b0bc6be8d44fecc953f158627c55bdae52e87139c202911d                                                                                      0.0s 
 => => exporting config sha256:dd78505ad42da5eeaf60077356520df57e7893038bb4a8b8d53e78fe4c4892b6                                                                                        0.0s 
 => => sending tarball                                                                                                                                                                 1.9s 
Loaded image: sealos.hub:5000/library/ubuntu:22.04
```

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

## Run pods use private registry image

Create a sample deployment yaml

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
