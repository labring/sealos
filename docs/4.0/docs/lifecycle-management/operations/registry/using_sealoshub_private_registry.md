---
sidebar_position: 2
---

# How to Use Sealos as a Private Container Repository

## Working Principle

Every node runs an image-cri-shim daemon. When Kubelet needs to pull an image, it initiates a gRPC interaction command to image-cri-shim. This process will search for the image name in the private repository. If it exists locally, it will pull from there, otherwise, it will pull from the remote.

Execute the following command to verify the status of the image-cri-shim daemon:

```shell
$ systemctl status image-cri-shim.service 
```

## Where the Private Repository Runs

The private repository of Sealos runs by default on the first node of the cluster. The first node is the first node address entered when creating the cluster. Use the command below to check the status of the daemon:

```shell
$ systemctl status registry.service 
```

**Note:** The repository data is saved in the `/var/lib/sealos/data/default/rootfs/registry/` directory.

## Login to the Private Container Image Repository

Sealos private repository runs on HTTP using the `--net host` parameter. It should be locally configured with insecure-registries, and then connected using the IP address of the first node. The Docker client configuration is referenced as follows:

```json
# cat /etc/docker/daemon.json 
{
  "insecure-registries": ["192.168.1.10:5000"],
}
```

Use the `sealos login` command for login. The default username and password are `admin:passw0rd`.

```shell
sealos login -u admin -p passw0rd 192.168.1.10:5000
```

You can also use the `docker login` command.

```shell
docker login -u admin -p passw0rd 192.168.1.10:5000 
```

## Pushing and Pulling Images

Example of pushing an image:

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

Example of pulling an image:

```shell
sealos pull 192.168.72.50:5000/skopeo/stable
```

Or use the `docker pull` command:

```shell
docker pull 192.168.72.50:5000/skopeo/stable
```
