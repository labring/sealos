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

## Login to the private registry

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

Or use the `sealos login` command.

```shell
$ sealos login -u admin -p passw0rd sealos.hub:5000
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
