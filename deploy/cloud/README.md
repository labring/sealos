# Sealos cloud cluster image

-------
## prepare

1. A cloud domain and dns to your k8s cluster. Suppose your domain name is `cloud.example.io`.
2. A TLS cert that resolves `cloud.example.io` and `*.cloud.example.io`

### kubernetes cluster
```shell
sealos gen labring/kubernetes:v1.25.6 \
  labring/helm:v3.8.2 \
  labring/calico:v3.24.1 \
  labring/cert-manager:v1.8.0 \
  labring/openebs:v3.4.0 \
  labring/kubernetes-reflector:v7.0.151 \
   --masters 172.16.236.195 > Clusterfile

sealos apply -f Clusterfile
```

Note: if you want to change pod cidr, please edit the Clusterfile before run `sealos apply`

### ingress-nginx
create `ingress-nginx-config.yaml` file
```yaml
# ingress-nginx-config.yaml
apiVersion: apps.sealos.io/v1beta1
kind: Config
metadata:
  creationTimestamp: null
  name: ingress-nginx-config
spec:
  data: |
    controller:
      hostNetwork: true
      kind: DaemonSet
      service:
        type: NodePort
  match: docker.io/labring/ingress-nginx:v1.5.1
  path: charts/ingress-nginx/values.yaml
  strategy: merge
```

install ingress-nginx and switch to NodePort mode
```shell
sealos run docker.io/labring/ingress-nginx:v1.5.1 --config-file ingress-nginx-config.yaml
```

### save your cert file to a sealos config file

#### please make sure spec.match is the same as the image you want to run and ths registry name such as ghcr.io/docker.io

```yaml
# tls-secret.yaml
apiVersion: apps.sealos.io/v1beta1
kind: Config
metadata:
  name: secret
spec:
  path: manifests/tls-secret.yaml
  match: ghcr.io/labring/sealos-cloud:dev
  strategy: merge
  data: |
    data:
      tls.crt: <your-tls.crt-base64>
      tls.key: <your-tls.key-base64>
```

------
## run sealos cloud cluster image
```shell
sealos run ghcr.io/labring/sealos-cloud:dev --config-file tls-secret.yaml --env cloudDomain="cloud.example.com"
```
