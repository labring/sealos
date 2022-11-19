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

The sealos private registry runs on the first node of the cluster，The first node of the cluster is where you run the create cluster command, you can see this container with the following command.

```shell
$ nerdctl ps
CONTAINER ID    IMAGE                               COMMAND                   CREATED         STATUS    PORTS    NAMES
eb772a8cc788    docker.io/library/registry:2.7.1    "/entrypoint.sh /etc…"    22 hours ago    Up                 sealos-registry 
```

**Notes:** The data of the registry is saved in `/var/lib/sealos/data/default/rootfs/registry/` directory.

## Login to the private registry

Sealos private registry runs with HTTP and `--net host ` option，You should configure insecure-registries at local and connect with the first node's IP address，Example of docker client config.

```json
# cat /etc/docker/daemon.json 
{
  "insecure-registries": ["192.168.1.10:5000"],
}
```

Login with `sealos login` command, the default username and password is `admin:passw0rd`.

```shell
sealos login 192.168.1.10:5000 -u admin -p passw0rd
```

Or use the `docker login` command.

```shell
docker login 192.168.1.10:5000 -u admin -p passw0rd 
```

## Push and pull images

Push image example:

```shell
$ sealos tag quay.io/skopeo/stable 192.168.72.50:5000/skopeo/stable
$ sealos push 192.168.72.50:5000/skopeo/stable
Using default tag: latest
The push refers to repository [192.168.72.50:5000/skopeo/stable]
a98b3d943f46: Pushed 
b48290351261: Pushed 
f39ec3c22bd5: Pushed 
e5a31cf70f11: Pushed 
b9394289d761: Pushed 
c550c8e0f355: Pushed 
latest: digest: sha256:238efd85942755fbd28d4d23d1f8dedd99e9eec20777e946f132633b826a9295 size: 1570
```

Pull image example:

```shell
sealos pull 192.168.72.50:5000/skopeo/stable
```

Or use the `docker pull` command:

```shell
docker pull 192.168.72.50:5000/skopeo/stable
```
