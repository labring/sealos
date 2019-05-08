[![Awesome](https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg)](https://github.com/fanux/sealos)
[![Build Status](https://cloud.drone.io/api/badges/fanux/sealos/status.svg)](https://cloud.drone.io/fanux/sealos)

# Introduction
Build a production kubernetes HA cluster.

![](./arch.png)

* Every node config a ipvs proxy for masters LB, so we needn't haproxy or keepalived any more.
* Then run a [lvscare](https://github.com/fanux/lvscare) as a staic pod to check apiserver is aviliable. `/etc/kubernetes/manifests/sealyun-lvscare.yaml`
* If any master is down, lvscare will remove the ipvs realserver, when master recover it will add it back.
* Sealos will send package and apply install commands, so we needn't ansible.

# Quick Start
## PreInstall
* Install and start docker
* Download [kubernetes offline package](https://github.com/sealstore/cloud-kernel/releases/) copy it to /root. 
* Download [latest sealos](https://github.com/fanux/sealos/releases) on release page.
* Support kuberentes 1.14.0+ 

## Install
```
sealos init --master 192.168.0.2 \
    --master 192.168.0.3 \
    --master 192.168.0.4 \              
    --node 192.168.0.5 \                 
    --user root \                        
    --passwd your-server-password \      
    --pkg-url /root/kube1.14.1.tar.gz     
```
Thats all!

```
--master   masters list
--node     nodes list
--user     host user name
--passwd   host passwd
--pkg-url  you offline package location
```

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

# More infomations

About [LVScare](https://github.com/fanux/LVScare)

This can care your masters ipvs rules.

About super kubeadm [简体中文,kubernetes v1.14.0+](https://sealyun.com/post/super-kubeadm/)

[简体中文](README_zh.md)

[简体中文老版本](https://sealyun.com/post/sealos/)

[sealos 1.x docs](https://github.com/fanux/sealos/tree/v1.14.0)

[More offline packages](http://store.lameleg.com)
