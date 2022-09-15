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

### Install ingress-nginx and cert-manager
1. [ingress-nginx](https://kubernetes.io/docs/tutorials/ingress/nginx-ingress/)  
 *If you are using a bare-metal hosts, you will wish to install `hostNetwork`+`DaemonSet` ingress-nginx.*  
 *See more: https://kubernetes.github.io/ingress-nginx/deploy/baremetal/#via-the-host-network*
2. [cert-manager](https://cert-manager.io/)

### Apply cert-manager and ingress configs
Note: currently we are using `acme`+`dns01` to auto create and manage certs.

### Apply `reflector` to sync tls secrets
1. Install [reflector](https://github.com/emberstack/kubernetes-reflector)
2. Update `Certificate` to share tls keys to destination namespaces.

@see: https://cert-manager.io/docs/tutorials/syncing-secrets-across-namespaces/#using-reflector

### Side: using Godaddy as dns01 issuer
1. Install custom godaddy webhook: [godaddy-webhook](https://github.com/snowdrop/godaddy-webhook)
2. Following readme to install and apply
3. Using `ignress-nginx-cloud/` to apply wildcard domain cert

## Troubleshooting

### The **DaemonSet** ingress-nginx-controller do not run on masters
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

       