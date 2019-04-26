[![Awesome](https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg)](https://github.com/fanux/sealos)
[![Build Status](https://cloud.drone.io/api/badges/fanux/sealos/status.svg)](https://cloud.drone.io/fanux/sealos)

[简体中文老版本](https://sealyun.com/post/sealos/)

[sealos 1.x docs](https://github.com/fanux/sealos/tree/v1.14.0)

# Sealos 2.0
[简体中文](README_zh.md)

Support kuberentes 1.14.0+ , you needn't keepalived and haproxy anymore!

build a production kubernetes cluster

# Quick Start
## Pre
* Install and start docker
* Download [kubernetes offline package](http://store.lameleg.com) copy it to /root. PS: if you star sealos, you can download it free.
* Download [latest sealos](https://github.com/fanux/sealos/releases) on release page.

## Install
```
sealos init --master 192.168.0.2 \
    --master 192.168.0.3 \
    --master 192.168.0.4 \  # masters list
    --node 192.168.0.5 \    # nodes list
    --user root \           # host user name
    --passwd your-server-password \ # host passwd
    --pkg-url /root/kube1.14.1.tar.gz # you offline package location 
```
Thats all!

Other flags:
```
 --kubeadm-config string   kubeadm-config.yaml local 
 --vip string              virtual ip (default "10.103.97.2") 
```

## Clean
```
sealos clean \
    --master 192.168.0.2 \
    --master 192.168.0.3 \
    --master 192.168.0.4 \           
    --node 192.168.0.5 \              
    --user root \                    
    --passwd your-server-password
```

## Add nodes
Using super kubeadm:
```
cd kube/shell && init.sh
echo "10.103.97.2 apiserver.cluster.local" >> /etc/hosts   # using vip
kubeadm join 10.103.97.2:6443 --token 9vr73a.a8uxyaju799qwdjv \
    --master 10.103.97.100:6443 \
    --master 10.103.97.101:6443 \
    --master 10.103.97.102:6443 \
    --discovery-token-ca-cert-hash sha256:7c2e69131a36ae2a042a339b33381c6d0d43887e2de83720eff5359e26aec866
```

# Architecture
```
  +----------+                       +---------------+  virturl server: 127.0.0.1:6443
  | mater0   |<----------------------| ipvs nodes    |    real servers:
  +----------+                      |+---------------+            10.103.97.200:6443
                                    |                             10.103.97.201:6443
  +----------+                      |                             10.103.97.202:6443
  | mater1   |<---------------------+
  +----------+                      |
                                    |
  +----------+                      |
  | mater2   |<---------------------+
  +----------+
```

Every node config a ipvs for masters LB.

Then run a lvscare as a staic pod to check realserver is aviliable. `/etc/kubernetes/manifests/sealyun-lvscare.yaml`

About [LVScare](https://github.com/fanux/LVScare)

This can care your masters ipvs rules.

About super kubeadm [简体中文,kubernetes v1.14.0+](https://sealyun.com/post/super-kubeadm/)

# 公众号：
![sealyun](https://sealyun.com/kubernetes-qrcode.jpg)
