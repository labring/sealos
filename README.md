[![Awesome](https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg)](https://github.com/fanux/sealos)
[![Build Status](https://cloud.drone.io/api/badges/fanux/sealos/status.svg)](https://cloud.drone.io/fanux/sealos)

[简体中文,老版本](https://sealyun.com/post/sealos/)

[离线包购买市场](http://store.lameleg.com/)

[sealos 1.x docs](https://github.com/fanux/sealos/tree/v1.14.0)

# Sealos 2.0
Support kuberentes 1.14.0+ , you needn't keepalived and haproxy anymore!

build a production kubernetes cluster

# Quick Start
```
sealos init --master 192.168.0.2 --master 192.168.0.3 --master 192.168.0.4 --node 192.168.0.5 --user root --passwd your-server-password
```
Thats all!


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
