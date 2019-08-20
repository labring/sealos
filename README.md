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
Multi master HA:
```
sealos init --master 192.168.0.2 \
    --master 192.168.0.3 \
    --master 192.168.0.4 \              
    --node 192.168.0.5 \                 
    --user root \                        
    --passwd your-server-password \      
    --version v1.14.1 \
    --pkg-url /root/kube1.14.1.tar.gz     
```

OR single master:
```
sealos init --master 192.168.0.2 \
    --node 192.168.0.5 \                 
    --user root \                        
    --passwd your-server-password \      
    --version v1.14.1 \
    --pkg-url /root/kube1.14.1.tar.gz 
```

OR using ssh private key:
```
sealos init --master 172.16.198.83 \
    --node 172.16.198.84 \
    --pkg-url https://sealyun.oss-cn-beijing.aliyuncs.com/free/kube1.15.0.tar.gz \
    --pk /root/kubernetes.pem # this is your ssh private key file \
    --version v1.15.0
```

Thats all!

```
--master   masters list
--node     nodes list
--user     host user name
--passwd   host passwd
--pkg-url  you offline package location
--version  kubernetes version
```

Other flags:
```
 --kubeadm-config string   kubeadm-config.yaml local 
 --vip string              virtual ip (default "10.103.97.2") 
```

Check cluster:
```
[root@iZj6cdqfqw4o4o9tc0q44rZ ~]# kubectl get node
NAME                      STATUS   ROLES    AGE     VERSION
izj6cdqfqw4o4o9tc0q44rz   Ready    master   2m25s   v1.14.1
izj6cdqfqw4o4o9tc0q44sz   Ready    master   119s    v1.14.1
izj6cdqfqw4o4o9tc0q44tz   Ready    master   63s     v1.14.1
izj6cdqfqw4o4o9tc0q44uz   Ready    <none>   38s     v1.14.1
[root@iZj6cdqfqw4o4o9tc0q44rZ ~]# kubectl get pod --all-namespaces
NAMESPACE     NAME                                              READY   STATUS    RESTARTS   AGE
kube-system   calico-kube-controllers-5cbcccc885-9n2p8          1/1     Running   0          3m1s
kube-system   calico-node-656zn                                 1/1     Running   0          93s
kube-system   calico-node-bv5hn                                 1/1     Running   0          2m54s
kube-system   calico-node-f2vmd                                 1/1     Running   0          3m1s
kube-system   calico-node-tbd5l                                 1/1     Running   0          118s
kube-system   coredns-fb8b8dccf-8bnkv                           1/1     Running   0          3m1s
kube-system   coredns-fb8b8dccf-spq7r                           1/1     Running   0          3m1s
kube-system   etcd-izj6cdqfqw4o4o9tc0q44rz                      1/1     Running   0          2m25s
kube-system   etcd-izj6cdqfqw4o4o9tc0q44sz                      1/1     Running   0          2m53s
kube-system   etcd-izj6cdqfqw4o4o9tc0q44tz                      1/1     Running   0          118s
kube-system   kube-apiserver-izj6cdqfqw4o4o9tc0q44rz            1/1     Running   0          2m15s
kube-system   kube-apiserver-izj6cdqfqw4o4o9tc0q44sz            1/1     Running   0          2m54s
kube-system   kube-apiserver-izj6cdqfqw4o4o9tc0q44tz            1/1     Running   1          47s
kube-system   kube-controller-manager-izj6cdqfqw4o4o9tc0q44rz   1/1     Running   1          2m43s
kube-system   kube-controller-manager-izj6cdqfqw4o4o9tc0q44sz   1/1     Running   0          2m54s
kube-system   kube-controller-manager-izj6cdqfqw4o4o9tc0q44tz   1/1     Running   0          63s
kube-system   kube-proxy-b9b9z                                  1/1     Running   0          2m54s
kube-system   kube-proxy-nf66n                                  1/1     Running   0          3m1s
kube-system   kube-proxy-q2bqp                                  1/1     Running   0          118s
kube-system   kube-proxy-s5g2k                                  1/1     Running   0          93s
kube-system   kube-scheduler-izj6cdqfqw4o4o9tc0q44rz            1/1     Running   1          2m43s
kube-system   kube-scheduler-izj6cdqfqw4o4o9tc0q44sz            1/1     Running   0          2m54s
kube-system   kube-scheduler-izj6cdqfqw4o4o9tc0q44tz            1/1     Running   0          61s
kube-system   kube-sealyun-lvscare-izj6cdqfqw4o4o9tc0q44uz      1/1     Running   0          86s
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
Fetch join command:
```
kubeadm token create --print-join-command
```

Using super kubeadm, add `--master` flags in join command:
```
cd kube/shell && init.sh
echo "10.103.97.2 apiserver.cluster.local" >> /etc/hosts   # using vip
kubeadm join 10.103.97.2:6443 --token 9vr73a.a8uxyaju799qwdjv \
    --master 10.103.97.100:6443 \
    --master 10.103.97.101:6443 \
    --master 10.103.97.102:6443 \
    --discovery-token-ca-cert-hash sha256:7c2e69131a36ae2a042a339b33381c6d0d43887e2de83720eff5359e26aec866
```

## Using config file
For example, we need add a certSANs `sealyun.com`:
```
sealos config -t kubeadm >>  kubeadm-config.yaml.tmpl
```
See the config template file `cat kubeadm-config.yaml.tmpl`, edit it add `sealyun.com`:
```
apiVersion: kubeadm.k8s.io/v1beta1
kind: ClusterConfiguration
kubernetesVersion: {{.Version}}
controlPlaneEndpoint: "apiserver.cluster.local:6443"
networking:
  podSubnet: 100.64.0.0/10
apiServer:
        certSANs:
        - sealyun.com # this is what I added
        - 127.0.0.1
        - apiserver.cluster.local
        {{range .Masters -}}
        - {{.}}
        {{end -}}
        - {{.VIP}}
---
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: "ipvs"
ipvs:
        excludeCIDRs: 
        - "{{.VIP}}/32"
```

Then using --kubeadm-config flag:
```
sealos init --kubeadm-config kubeadm-config.yaml.tmpl \
    --master 192.168.0.2 \
    --master 192.168.0.3 \
    --master 192.168.0.4 \              
    --node 192.168.0.5 \                 
    --user root \                        
    --passwd your-server-password \      
    --version v1.14.1 \
    --pkg-url /root/kube1.14.1.tar.gz 
```

## upgrade
[升级简体中文](docs/upgrade_zh.md)

## build from source
```
docker run --rm -v $GOPATH/src/github.com/fanux/sealos:/go/src/github.com/fanux/sealos -w /go/src/github.com/fanux/sealos -it golang:1.12.7  go build
```
if you using go mod:
```
go build -mod vendor
```

# More infomations

About [LVScare](https://github.com/fanux/LVScare)

This can care your masters ipvs rules.

About super kubeadm [简体中文,kubernetes v1.14.0+](https://sealyun.com/post/super-kubeadm/)

[简体中文](README_zh.md)

[简体中文老版本](https://sealyun.com/post/sealos/)

[sealos 1.x docs](https://github.com/fanux/sealos/tree/v1.14.0)

[More offline packages](http://store.lameleg.com)

[Fist](https://github.com/fanux/fist) Light weight kubernetes manager, support JWT user token, powerful webterminal, yaml files render and namespaces PSP quota manager etc..
