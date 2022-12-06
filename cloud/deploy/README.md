# How to deploy the cloud service <small>(publicly accessible)</small>

## Pre-Requirements

### A running sealos kubernetes cluster
with at least svc(s) below:
 1. kubernetes
 2. calico
 3. service-auth(@see [service-auth](../../service/auth/README.md))

Optional:
 1. kubernetes-dashboard
 2. lens

### Base applications requirements
1. At least one storage Provider:
    * `openebs`(recommend) : `sealos run labring/openebs:v1.9.0`

    **Note: Please make sure there have one(and only one) default `StorageClass`**

    Example:
    ```bash
    cat <<EOF | kubectl apply -f -
    apiVersion: storage.k8s.io/v1
    kind: StorageClass
    metadata:
    name: default-storage-class
    annotations:
        storageclass.kubernetes.io/is-default-class: "true"
        openebs.io/cas-type: local
        cas.openebs.io/config: |
        - name: StorageType
            value: hostpath
        - name: BasePath
            value: /mnt/data_pv
    provisioner: openebs.io/local
    reclaimPolicy: Retain
    volumeBindingMode: WaitForFirstConsumer
    EOF
    ```
2. One Domain name with admin access
    * `ACMEDNS`, `Akamai`, `AzureDNS`, `CloudFlare`, `Google`, `Route53`, `DigitalOcean`, `RFC2136`
    * Any cert-manager supported `dns01` webhooks: [github-link](https://github.com/topics/cert-manager-webhook)

    Articles below assume the usage of sealos cloud's [godaddy](https://github.com/snowdrop/godaddy-webhook) webhook as example.

    *Please Prepare domain access key&secret for further usage*

### Choice what network gateway to use:

1. [APISIX](manifests/apisix/README.md) :point_left: Recommended
2. [Ingress-NGINX](manifests/ingress-nginx/README.md)