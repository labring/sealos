# Sealos cloud cluster image

-------
## prepare

1. A cloud domain and dns to your k8s cluster. Suppose your domain name is `cloud.example.io`.
2. A TLS cert that resolves `cloud.example.io` and `*.cloud.example.io`

Here is one way to get a TLS cert by using acme.sh with alidns.

1. install [acme.sh](https://github.com/acmesh-official/acme.sh)
2. get your alidns access key and secret key
3. run following command to get a TLS cert

    ```shell
    export Ali_Key="<your ali key>"
    export Ali_Secret="<your ali secret>"
    
    acme.sh --issue --dns dns_ali -d "cloud.example.io" -d "*.cloud.example.io"
    ```

4. base64 encode your cert and key, and save the output which will be used in the next step
    ```shell
        base64 -w 0 ~/.acme.sh/${<your domian path>}/fullchain.cer
        base64 -w 0 ~/.acme.sh/${<your domian path>}/${<your domian>}.key
    ```

Other dns api please read: https://github.com/acmesh-official/acme.sh/wiki/dnsapi

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
  match: docker.io/labring/sealos-cloud:latest
  strategy: merge
  data: |
    data:
      tls.crt: <your-fullchain.cer-base64>
      tls.key: <your-${your domain}.key-base64>
```

------
## run sealos cloud cluster image
```shell
sealos run docker.io/labring/sealos-cloud:latest --env cloudDomain="cloud.example.com" --config-file tls-secret.yaml
```
