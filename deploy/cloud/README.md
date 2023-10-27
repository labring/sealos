# Sealos cloud cluster image

## prepare

### DNS setup
A cloud domain and dns to your k8s cluster. Suppose your domain name is `127.0.0.1.nip.io` by using [nip.io](https://nip.io/). 
You need change the ip `127.0.0.1` to your real ip if you need access your cluster from outside or use other dns service.

### TLS setup
You need a TLS cert that resolves `127.0.0.1.nip.io` and `*.127.0.0.1.nip.io`.

#### Using acme.sh with alidns
Here is one way to get a TLS cert by using acme.sh with alidns.

1. install [acme.sh](https://github.com/acmesh-official/acme.sh)
2. get your alidns access key and secret key
3. run following command to get a TLS cert

    ```shell
    export Ali_Key="<your ali key>"
    export Ali_Secret="<your ali secret>"
    
    acme.sh --issue --dns dns_ali -d "127.0.0.1.nip.io" -d "*.127.0.0.1.nip.io"
    ```
4. base64 encode your cert and key, and save the output which will be used in the next step
    ```shell
    base64 -w 0 ~/.acme.sh/${<your domian path>}/fullchain.cer
    base64 -w 0 ~/.acme.sh/${<your domian path>}/${<your domian>}.key
    ```

Other dns api please read: https://github.com/acmesh-official/acme.sh/wiki/dnsapi

#### Using self-signed cert
We provide a self-signed cert for you to test by default if you didn't provide a cert. You can replace it with your own cert.

### Kubernetes Setup
Please read sealos doc to create a kubernetes cluster: https://sealos.io/docs/self-hosting/lifecycle-management/quick-start/deploy-kubernetes

```shell
sealos gen labring/kubernetes:v1.25.6\
    labring/helm:v3.12.0\
    labring/calico:v3.24.1\
    labring/cert-manager:v1.8.0\
    labring/openebs:v3.4.0\
    labring/kubernetes-reflector:v7.0.151\
    labring/kubeblocks:v0.6.2\
    labring/metrics-server:v0.6.4\
    --masters 10.140.0.16 \
    --nodes 10.140.0.17,10.140.0.18 > Clusterfile

sealos apply -f Clusterfile
```

Note: if you want to change pod cidr, please edit the `Clusterfile` before run `sealos apply`

### OpenEBS sc create

```shell
kubectl create -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-backup
provisioner: openebs.io/local
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
EOF
```

### Ingress-nginx setup
We use ingress-nginx to expose our services. You can install ingress-nginx by using sealos:

Create `ingress-nginx-config.yaml` file
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

Install ingress-nginx and switch to NodePort mode

```shell
sealos run docker.io/labring/ingress-nginx:v1.5.1 --config-file ingress-nginx-config.yaml
```

Note: if your domain is resolved to the master ip, you may need patch ingress-nginx DaemonSet to run on master node:

```shell
kubectl -n ingress-nginx patch ds ingress-nginx-controller -p '{"spec":{"template":{"spec":{"tolerations":[{"key":"node-role.kubernetes.io/master","operator":"Exists","effect":"NoSchedule"}]}}}}'
````

## run sealos cloud cluster image

### Generate TLS config file
You can skip this step if you use the self-signed cert which we provided by default. 

Please make sure `spec.match` is the same as the image you want to run and the registry name such as ghcr.io/docker.io can

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
      tls.crt: <your-tls.cer-base64>
      tls.key: <your-tls.key-base64>
```

```shell
sealos run docker.io/labring/sealos-cloud:latest\
    --env cloudDomain="127.0.0.1.nip.io"\
    --config-file tls-secret.yaml
```

If you already have a mongodb, you can use it by setting `--env mongodbUri=<your mongodb uri>`:

```shell
sealos run docker.io/labring/sealos-cloud:latest\
    --env cloudDomain="127.0.0.1.nip.io"\
    --env mongodbUri=<your mongodb uri>
```