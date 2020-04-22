[![Awesome](https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg)](https://github.com/fanux/sealos)
[![Build Status](https://cloud.drone.io/api/badges/fanux/sealos/status.svg)](https://cloud.drone.io/fanux/sealos)

[简体中文,老版本](https://sealyun.com/post/sealos/)

[离线包购买市场](http://store.lameleg.com/)

kubernetes 1.14以下版本请移步老掉牙教程[sealos 1.x docs](https://github.com/fanux/sealos/tree/v1.14.0)

# Sealos 2.0
支持kubernetes 1.14.0 以上版本，HA不再依赖keeplived与haproxy, 通过ipvs直接代理masters节点

通过lvscare健康检测masters, 是一种非常先进且稳定的HA方式。安装失败率极低。

![](./arch.jpg)

# 快速使用
## 准备条件
* 装好docker并启动docker
* 把[离线安装包](http://store.lameleg.com) 下载好拷贝到执行节点的任意目录,不需要解压,sealos会自动检测各个节点是否有安装包,若不存在则会scp到该节点。如果有文件服务器更好，sealos也支持从一个服务器上wget到所有节点上。 离线包中sealos暂不支持scp，请到release界面下载最新版sealos

## 安装
sealos已经放在离线包中，解压后在kube/bin目录下(可以解压一个，获取sealos bin文件)
```
sealos init \
    --master 192.168.0.2 \
    --master 192.168.0.3 \
    --master 192.168.0.4 \                    # master地址列表
    --node 192.168.0.5 \                      # node地址列表
    --user root \                             # 服务用户名
    --passwd your-server-password \           # 服务器密码，用于远程执行命令
    --pkg-url /root/kube1.14.1.tar.gz  \      # 离线安装包位置，可支持http/https服务器（http://store.lameleg.com/kube1.14.1.tar.gz）存放和本地（/root/kube1.14.1.tar.gz）存放两种方式。若对应节点上文件不存在则会从执行机器上scp文件到对应节点。
    --version v1.14.1                         # kubernetes 离线安装包版本，这渲染kubeadm配置时需要使用
```
然后，就没有然后了


其它参数:

```
 --kubeadm-config string   kubeadm-config.yaml local # 自定义kubeadm配置文件，如有这个sealos就不去渲染kubeadm配置
 --vip string              virtual ip (default "10.103.97.2") # 代理master的虚拟IP，只要与你地址不冲突请不要改
```


## 清理
```
sealos clean \
    --master 192.168.0.2 \
    --master 192.168.0.3 \
    --master 192.168.0.4 \          # master地址列表
    --node 192.168.0.5 \            # node地址列表
    --user root \                   # 服务用户名
    --passwd your-server-password
```

## 增加节点
新增节点可直接使用kubeadm， 到新节点上解压 
```
cd kube/shell && init.sh
echo "10.103.97.2 apiserver.cluster.local" >> /etc/hosts   # using vip
kubeadm join 10.103.97.2:6443 --token 9vr73a.a8uxyaju799qwdjv \
    --master 10.103.97.100:6443 \
    --master 10.103.97.101:6443 \
    --master 10.103.97.102:6443 \
    --discovery-token-ca-cert-hash sha256:7c2e69131a36ae2a042a339b33381c6d0d43887e2de83720eff5359e26aec866
```

## 安装dashboard prometheus等
离线包里包含了yaml配置和镜像，用户按需安装。
```
cd /root/kube/conf
kubectl taint nodes --all node-role.kubernetes.io/master-  # 去污点，根据需求看情况，去了后master允许调度
kubectl apply -f heapster/ # 安装heapster, 不安装dashboard上没监控数据
kubectl apply -f heapster/rbac 
kubectl apply -f dashboard  # 装dashboard
kubectl apply -f prometheus # 装监控
```

# 原理
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
sealos 只是帮助用户去渲染配置远程执行命令，低层依赖两个东西，一个是lvscare，一个是定制化的超级kubeadm

关于[LVScare](https://github.com/fanux/LVScare)

关于超级kubeadm[简体中文,kubernetes v1.14.0+](https://sealyun.com/post/super-kubeadm/)

会以类似kube-proxy的ipvs的形式去守护k8s master节点，一旦apiserver不可访问了，会自动清理掉所有node上对应的ipvs规则， master恢复正常时添加回来。

# 公众号：
![sealyun](https://sealyun.com/kubernetes-qrcode.jpg)
