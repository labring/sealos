---
sidebar_position: 5
---

# Building Cluster Images Based on go-template

During the process of building cluster images, we can use the `--env` option to pass some variables through the sealos command line. These environment variables can be used by the `CMD` command of the Kubefile or the yaml file template.

## Using Environment Variables in Kubefile

This example defines a `SERVICE_TYPE` variable that allows the user to customize the service exposure type when installing the application and pass parameters to the helm command in CMD.

Kubefile example:

```shell
FROM scratch
ENV SERVICE_TYPE "NodePort"
COPY charts charts
COPY registry registry
CMD ["helm upgrade --install nginx charts/nginx --namespace=nginx --create-namespace --set service.type=$(SERVICE_TYPE)"]
```

Run the cluster application and set a custom `SERVICE_TYPE=LoadBalancer`, if not set, it will default to NodePort.

```shell
sealos run labring/nginx:v1.23.1 --env SERVICE_TYPE=LoadBalancer
```

## Using Environment Variables in Yaml Files

Prepare a simple nginx service yaml file, this file must be a `*.tmpl` extension to be rendered when running `sealos run --env` command.

```shell
$ cat manifests/service.yaml.tmpl
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    name: nginx
spec:
  type: {{ .serviceType }}
  ports:
    - port: 80
      nodePort: {{ .http_NodePort }}
      name: http
    - port: 443
      nodePort: {{ .https_NodePort }}
      name: https
  selector:
    name: nginx
```

Here is a Kubefile example where you can set the default environment variables.

```shell
FROM scratch
ENV serviceType NodePort
ENV http_NodePort 30080
ENV https_NodePort 30443

COPY manifests manifests
COPY registry registry
CMD ["kubectl apply -f manifests/service.yaml"]
```

When you build the image, nothing will happen, it only renders when running the application. If `--env` is not set, it will use the default ENV in Kubefile.

```shell
sealos run labring/nginx:1.23.1 --env serviceType=LoadBalancer --env http_NodePort=30080 --env https_NodePort=30443
```

You will find that sealos renders a new yaml file `service.yaml` based on `service.yaml.tmpl` on the local path of the master node.

**Note** The new version of the application's rootfs is placed in the `/var/lib/sealos/data/default/applications` directory, each application has its independent directory.

```shell
root@node1:~# ls /var/lib/sealos/data/default/rootfs/manifests |grep service
service.yaml
service.yaml.tmpl
```

Check the yaml content:

```shell
root@node1:~# cat /var/lib/sealos/data/default/rootfs/manifests/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    name: nginx
spec:
  type: NodePort
  ports:
    - port: 80
      nodePort: 30080
      name: http
    - port: 443
      nodePort: 30443
      name: https
  selector:
    name: nginx
```

**Note:** All types of files support this feature (the file name suffix is .tmpl and the build directory is in etc, scripts, and manifests), you can try it yourself.
