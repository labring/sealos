# Optional Choice: Install Apisix for outbound networking

## [Pre-Requirements](../../README.md)

sealos cloud can use `apisix` to manage internal traffics to outbound network traffics.

With domain name support, using cert-manager to auto-signed wildcard certificate.

## Install APISIX-Ingress and Cert-Manager
1. [cert-manager](https://cert-manager.io/)
    ```bash
    sealos run labring/cert-manager:v1.8.0
    ```
2. [apisix-ingress-controller](https://apisix.apache.org/docs/ingress-controller/tutorials/the-hard-way/) 
    ```bash
    sealos run labring/apisix:2.15.0
    ```
    *If you are using a bare-metal hosts, you will wish to install `hostNetwork`+`DaemonSet`.* 

    *If you do not have one(and only one) default storageClass, you may update helm to spec `storageClass`: `--set global.storageClass=`* 
    ```bash
    cd /var/lib/sealos/data/default/rootfs
    helm upgrade -i apisix charts/apisix --set gateway.type=NodePort,ingress-controller.enabled=true,ingress-controller.config.apisix.serviceNamespace=ingress-apisix --set global.storageClass="YOUR-STORAGECLASS-HERE" -n ingress-apisix --create-namespace
    ```

### Apply cert-manager and ingress configs
Note: currently we are using `acme`+`dns01` to auto create and manage certs.

### Side: using Godaddy as dns01 issuer
1. Install custom godaddy webhook: [godaddy-webhook](https://github.com/snowdrop/godaddy-webhook)
2. Following readme to install and apply
3. Using `ignress-nginx-cloud/` to apply wildcard domain cert

## Troubleshooting

### Support `tls` when deploy using `sealos run`
If you need to run sealos cloud at a bear-metal environment, you need to update helm charts to enable `tls`+`DaemonSet` support:
find charts command, and add `gateway.tls.enabled=true`+`apisix.kind=DaemonSet`
```bash
helm upgrade -i apisix charts/apisix --set gateway.type=NodePort,ingress-controller.enabled=true,gateway.tls.enabled=true,apisix.kind=DaemonSet,ingress-controller.config.apisix.serviceNamespace=ingress-apisix -n ingress-apisix --create-namespace
```

### The **DaemonSet** apisix do not run on masters
```shell
kubectl taint node [masters-node-name] node-role.kubernetes.io/master-
```
May be there are new taints like *`NoSchedule`*, just delete them all. 

### The **godaddy-webhook** related
1. > `User "system:serviceaccount:cert-manager:cert-manager" cannot create resource "godaddy" in API group "xxx.xxx.xxx" at the cluster scope`

    Check `groupName` field, currently it's hardcoded to `acme.mycompany.com`, and must be edited under `godaddy-webhook`'s `ClusterRole` and re-apply. https://github.com/cert-manager/cert-manager/issues/3432

2. > `Error presenting challenge: secrets "godaddy-api-key" not found`

    Error presenting challenge: secrets "godaddy-api-key" not found. https://github.com/cert-manager/cert-manager/issues/650

3. > `Error presenting challenge: Unable to check the TXT record: ### Unexpected HTTP status: 403`

    https://cert-manager.io/docs/troubleshooting/webhook/

## REF:

* https://www.cnblogs.com/ssgeek/p/12421917.html
* https://kubernetes.github.io/ingress-nginx/troubleshooting/

       