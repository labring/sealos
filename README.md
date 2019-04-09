[![Awesome](https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg)](https://github.com/fanux/sealos)
[![Build Status](https://cloud.drone.io/api/badges/fanux/sealos/status.svg)](https://cloud.drone.io/fanux/sealos)

[简体中文,老版本](https://sealyun.com/post/sealos/)

[离线包购买市场](http://store.lameleg.com/)

[sealos 1.x docs](https://github.com/fanux/sealos/tree/v1.14.0)

# Sealos 2.0
Support kuberentes 1.14.0+ , you needn't keepalived and haproxy anymore!

build a production kubernetes cluster

# Features
- [x] support etcd cluster and TLS, using static pod to init etcd cluster, so monitor and management will be easy
- [x] kubernetes master cluster
- [x] calico etcd TLS, calico using etcd cluster
- [x] dashboard, heapster coreDNS addons
- [x] promethus support, using promethus operator
- [x] [istio support](https://sealyun.com/pro/istio/)

# Quick Start
|ip | role|
| --- | --- |
| 10.103.97.100 | master0|
| 10.103.97.101 | master0|
| 10.103.97.102 | master0|
| 10.103.97.1 | virtulIP|
| apiserver.cluster.local | apiserver resove name|


## Download super [kubeadm](https://github.com/fanux/kube/releases/tag/v0.0.30-kubeadm-lvscare)support master HA with local LVS loadbalance.

## Config kubeadm
cat kubeadm-config.yaml :
```
apiVersion: kubeadm.k8s.io/v1beta1
kind: ClusterConfiguration
kubernetesVersion: v1.14.0
controlPlaneEndpoint: "apiserver.cluster.local:6443" # apiserver DNS name
apiServer:
        certSANs:
        - 127.0.0.1
        - apiserver.cluster.local
        - 172.20.241.205
        - 172.20.241.206
        - 172.20.241.207
        - 172.20.241.208
        - 10.103.97.1          # virturl ip
---
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: "ipvs"
ipvs:
        excludeCIDRs: 
        - "10.103.97.1/32" # if you don't add this kube-proxy will clean your ipvs rule(kube-proxy still remove it)
```
## On master0 10.103.97.100
```
echo "10.103.97.100 apiserver.cluster.local" >> /etc/hosts
kubeadm init --config=kubeadm-config.yaml --experimental-upload-certs  
mkdir ~/.kube && cp /etc/kubernetes/admin.conf ~/.kube/config
kubectl apply -f https://docs.projectcalico.org/v3.6/getting-started/kubernetes/installation/hosted/kubernetes-datastore/calico-networking/1.7/calico.yaml # install calico
```

## On master1 10.103.97.101
```
echo "10.103.97.100 apiserver.cluster.local" >> /etc/hosts # resove to master0, change it to master1 when master1 init success
kubeadm join 10.103.97.100:6443 --token 9vr73a.a8uxyaju799qwdjv \
    --discovery-token-ca-cert-hash sha256:7c2e69131a36ae2a042a339b33381c6d0d43887e2de83720eff5359e26aec866 \
    --experimental-control-plane \
    --certificate-key f8902e114ef118304e561c3ecd4d0b543adc226b7a07f675f56564185ffe0c07 

sed "s/10.103.97.100/10.103.97.101/g" -i /etc/hosts  # if you don't change this, kubelet and kube-proxy will also using master0 apiserver, when master0 down, everything dead!
```

## On master2 10.103.97.102
```
echo "10.103.97.100 apiserver.cluster.local" >> /etc/hosts
kubeadm join 10.103.97.100:6443 --token 9vr73a.a8uxyaju799qwdjv \
    --discovery-token-ca-cert-hash sha256:7c2e69131a36ae2a042a339b33381c6d0d43887e2de83720eff5359e26aec866 \
    --experimental-control-plane \
    --certificate-key f8902e114ef118304e561c3ecd4d0b543adc226b7a07f675f56564185ffe0c07  

sed "s/10.103.97.100/10.103.97.101/g" -i /etc/hosts
```

## On your nodes
Join your nodes with local LVS LB 
```
echo "10.103.97.1 apiserver.cluster.local" >> /etc/hosts   # using vip
kubeadm join 10.103.97.1:6443 --token 9vr73a.a8uxyaju799qwdjv \
    --master 10.103.97.100:6443 \
    --master 10.103.97.101:6443 \
    --master 10.103.97.102:6443 \
    --discovery-token-ca-cert-hash sha256:7c2e69131a36ae2a042a339b33381c6d0d43887e2de83720eff5359e26aec866
```
Life is much easier!   

# Architecture
```
  +----------+                       +---------------+  virturl server: 127.0.0.1:6443
  | mater0   |<----------------------| ipvs nodes    |    real servers:
  +----------+                      |+---------------+            10.103.97.100:6443
                                    |                             10.103.97.101:6443
  +----------+                      |                             10.103.97.102:6443
  | mater1   |<---------------------+
  +----------+                      |
                                    |
  +----------+                      |
  | mater2   |<---------------------+
  +----------+
```

Every node config a ipvs for masters LB.

Then run a lvscare as a staic pod to check realserver is aviliable. `/etc/kubernetes/manifests/sealyun-lvscare.yaml`

# [LVScare](https://github.com/fanux/LVScare)
This can care your masters ipvs rules.

# 公众号：
![sealyun](https://sealyun.com/kubernetes-qrcode.jpg)
