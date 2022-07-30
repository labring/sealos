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
Note: currently we are using `acme`+`http01` to auto create and manage certs.

## Troubleshooting

### **DaemonSet** ingress-nginx-controller do not run on masters
```shell
kubectl taint node [masters-node-name] node-role.kubernetes.io/master-
```
May be there are new taints like *`NoSchedule`*, just delete them all. 

## REF:

* https://www.cnblogs.com/ssgeek/p/12421917.html
* https://kubernetes.github.io/ingress-nginx/troubleshooting/
       