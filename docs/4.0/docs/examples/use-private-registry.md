# How to use sealos private registry

## where it is

the sealos private registry running in the first nodes of the cluster,where you create your cluster, you can use the follow comand check it:

```
root@node01:~# nerdctl ps
CONTAINER ID    IMAGE                               COMMAND                   CREATED         STATUS    PORTS    NAMES
eb772a8cc788    docker.io/library/registry:2.7.1    "/entrypoint.sh /etc…"    22 hours ago    Up                 sealos-registry 
```

the registry images data store in  follow directory:

```
/var/lib/sealos/data/default/rootfs/registry/
```

## login to registry

sealos private registry runs with HTTP and `--net host` option. You should configure `insecure-registries` at local and connect with the first node's IP address. Example of docker client:

```
# cat /etc/docker/daemon.json 
{
  "insecure-registries": ["192.168.1.10:5000"],
}
```

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

pull image examle

```
sealos pull 192.168.72.50:5000/skopeo/stable
```

or `docker pull`

```
docker pull 192.168.72.50:5000/skopeo/stable
```
