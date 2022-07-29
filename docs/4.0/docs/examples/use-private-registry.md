<<<<<<< HEAD
# How to use sealos private registry

## Where the private registry running

The sealos private  registry runs on the first node of the cluster，The first node of the cluster is where you run the create cluster command,You can see this container with the following command.

```shell
=======
# how to use sealos private registry

## where it is

the sealos private registry running in the first nodes of the cluster,where you create your cluster, you can use the follow comand check it:

```
>>>>>>> 56e0c0b479a456996711299a5c4815640eccc17c
root@node01:~# nerdctl ps
CONTAINER ID    IMAGE                               COMMAND                   CREATED         STATUS    PORTS    NAMES
eb772a8cc788    docker.io/library/registry:2.7.1    "/entrypoint.sh /etc…"    22 hours ago    Up                 sealos-registry 
```

<<<<<<< HEAD
**Notes:** The data of the registry  is saved in `/var/lib/sealos/data/default/rootfs/registry/` directory.

## Login to the private registry

Sealos private registry runs with HTTP and `--net host ` option，You should configure insecure-registries at local and connect with the first node's IP address，Example of docker client config.

```json
=======
the registry images data store in  follow directory:

```
/var/lib/sealos/data/default/rootfs/registry/
```

## login to registry

sealos private registry run with http and `--net host ` option，you should config insecure-registry at local and connect with first node ipaddress，example of docker client:

```
>>>>>>> 56e0c0b479a456996711299a5c4815640eccc17c
# cat /etc/docker/daemon.json 
{
  "insecure-registries": ["192.168.1.10:5000"],
}
```

<<<<<<< HEAD
Login with `sealos login` command, the default username and password is `admin/passw0rd`.

```shell
sealos login 192.168.1.10:5000 -u admin -p passw0rd
```

Or use the `docker login` command.

```shell
docker login 192.168.1.10:5000 -u admin -p passw0rd 
```

## Push and pull images

Push image example.
```shell
=======
login with `sealos login` , the default username and password is `admin/passw0rd`

```
sealos login 192.168.1.10:5000 -u admin -p passw0rd
```

or `docker login`

```
docker login 192.168.1.10:5000 -u admin -p passw0rd 
```

## push and pull images

push image example
```
>>>>>>> 56e0c0b479a456996711299a5c4815640eccc17c
root@ubuntu:~# sealos tag quay.io/skopeo/stable 192.168.72.50:5000/skopeo/stable
root@ubuntu:~# sealos push 192.168.72.50:5000/skopeo/stable
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

<<<<<<< HEAD
Pull image examle.

```shell
sealos pull 192.168.72.50:5000/skopeo/stable
```

Or use the `docker pull` command.

```shell
=======
pull image examle

```
sealos pull 192.168.72.50:5000/skopeo/stable
```

or `docker pull`

```
>>>>>>> 56e0c0b479a456996711299a5c4815640eccc17c
docker pull 192.168.72.50:5000/skopeo/stable
```
