# Build cloud image with env

When building a cloud image, you can also pass some variables from the sealos command line with `--env` option. 

This env can be used by Kubefile `CMD` command, or manifests template yaml file.

## Use env in Kubefile

This example define a `SERVICE_TYPE`  variable, it allows user to customize the service expose type when installing applications, and pass the parameter to the helm command in CMD.

The Kubefile  example:

```shell
FROM scratch
ENV SERVICE_TYPE "NodePort"
COPY charts charts
COPY registry registry
CMD ["helm upgrade --install nginx charts/nginx --namespace=nginx --create-namespace --set service.type=$(SERVICE_TYPE)"]
```

Run cloud application and set a custome `SERVICE_TYPE=loadbalancer`, if not set , it will be default as NodePort.

```shell
sealos run labring/nginx:v1.23.1 --env SERVICE_TYPE=LoadBalancer
```

## Use env in Yaml file

Prepare a simple nginx service yaml file, the file must be `*.tmpl`, so it can be Render when run `sealos run --env` command.

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

The sample Kubefile, you can set default env here.

```shell
FROM scratch
ENV serviceType NodePort
ENV http_NodePort 30080
ENV https_NodePort 30443

COPY manifests manifests
COPY registry registry
CMD ["kubectl apply -f manifests/service.yaml"]
```

When you build the image ,nothing will be happen, it will render when running the application. if `--env` not set, it will use Kubefile default ENV.

```shell
sealos run labring/nginx:1.23.1 --env serviceType=LoadBalancer --env http_NodePort=30080 --env https_NodePort=30443
```

You will find sealos will Render a new yaml file named `service.yaml` based on `service.yaml.tmpl` on master node local path.

```shell
root@node1:~# ls /var/lib/sealos/data/default/rootfs/manifests |grep service
service.yaml
service.yaml.tmpl
```

check the yaml content

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

**Notes:** Maybe all types of files support this, You can try it yourself.
