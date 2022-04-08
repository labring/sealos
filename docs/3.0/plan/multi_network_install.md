# 多网卡在sealos中的解决方案

## 情形一

> 有网络环境如下：每台服务器两张网卡，千兆网络直通互联网，名字ens33，默认路由走该网卡。
> 万兆网二层打通。网卡名字ens32。 如果配置了路由更好， 没有配置的话，也不影响。
>
假定环境如下： 
 `192.168.160.1` 为外网网卡路由
 `192.168.253.0/24` 为内网网段.
 
 | 主机名称 | 网卡1(ens33)           | 网卡2(ens32) |
 | ---- | --------------- | --------------- |
 | master1   | 192.168.160.243 | 192.168.253.129 |
 | master2   | 192.168.160.244 | 192.168.253.128 |
 | master3   | 192.168.160.245 | 192.168.253.130 |
 | node01    | 192.168.160.246 | 192.168.253.131 | 

ip和路由情况， 其他类同。

```
 $ ip a |grep inet 
    inet 127.0.0.1/8 scope host lo
    inet 192.168.253.129/24 brd 192.168.253.255 scope global noprefixroute dynamic ens32
    inet 192.168.160.243/23 brd 192.168.161.255 scope global noprefixroute ens33
$ ip route show | grep default
 default via 192.168.160.1 dev ens33
```

希望使用万兆`ens32`内网部署`kubernetes v1.19.2`高可用集群。

```
$ wget -c https://sealyun-home.oss-cn-beijing.aliyuncs.com/sealos/latest/sealos && \
    chmod +x sealos && mv sealos /usr/bin 

## 离线资源包自行下载， 默认已经下载到`/root/`。

$ sealos init --master 192.168.253.128 \
    --master 192.168.253.129 \
    --master 192.168.253.130 \
    --node 192.168.253.131 \
    --pkg-url /root/kube1.19.2.tar.gz \
    --version v1.19.2  \
    --passwd centos   \
    --interface ens32 | tee -a 1.19.2.new.log
```

> 参数名称解析

参数名|含义|示例
---|---|---
passwd|服务器密码|centos
master|k8s master节点IP地址| 192.168.253.128 
node|k8s node节点IP地址|192.168.253.131
pkg-url|离线资源包地址，支持下载到本地，或者一个远程地址|/root/kube1.19.2.tar.gz 
version|[资源包](https://www.sealyun.com/goodsList) 对应的版本|v1.19.2
interface|calico使用的网卡名称或者路由|ens32

**注意事项**： 

> 0. 各节点时间同步.
> 1. 各节点主机名不能重复.
> 2. 双网卡需要指定`interface`. 不然部署后， calico启动不了， 后面情形二会详细说明.
> 3. 服务器密码不一样，采用`--pk /root/.ssh/id_rsa` 密钥进行验证. 


## 情形二

> 有网络环境如下：每台服务器两张网卡，千兆网络直通互联网，默认路由走该网卡。

> 万兆网二层打通。 每台服务器有由于前期规划原因， 各网卡名称不一样， 万兆内网环境有路由。

假定环境如下： 
 `192.168.160.1` 为外网网卡路由
 `192.168.253.1` 为内网路由.
 
 | 主机名称 | 网卡1(外网网卡)          | 网卡2(内网网卡) |
 | ---- | --------------- | --------------- |
 | master1   | 192.168.160.243 | 192.168.253.129 |
 | master2   | 192.168.160.244 | 192.168.253.128 |
 | master3   | 192.168.160.245 | 192.168.253.130 |
 | node01    | 192.168.160.246 | 192.168.253.131 | 
 
希望使用万兆内网部署`kubernetes v1.19.2`高可用集群, 三层有路由`192.168.253.1`。

```
$ wget -c https://sealyun-home.oss-cn-beijing.aliyuncs.com/sealos/latest/sealos && \
    chmod +x sealos && mv sealos /usr/bin 

## 离线资源包自行下载， 默认已经下载到`/root/`。

$ sealos init --master 192.168.253.128 \
    --master 192.168.253.129 \
    --master 192.168.253.130 \
    --node 192.168.253.131 \
    --pkg-url /root/kube1.19.2.tar.gz \
    --version v1.19.2  \
    --passwd centos   \
    --interface 192.158.253.1 | tee -a 1.19.2.new.log
```

这里`--interface` 使用路由的原理是[IP_AUTODETECTION_METHOD](https://docs.projectcalico.org/reference/node/configuration#ip-autodetection-methods) 
`IP_AUTODETECTION_METHOD=can-reach=DESTINATION`。 目前这边使用的是`网卡名称`和`ipv4`， 来适配。 
如果自行安装cni。 使用`--without-cni` 来避免安装cni。 

node节点和master节点的api通信， 是sealos/lvscare， 基于内核ipvs， 类似kube-proxy的实现。 
node 节点如果默认路由是`192.168.160.1`. 则`10.103.97.2:6443 -> 192.168.253.129:6443` 这个就必然不通。
因此 sealos这里 为用户添加了一条专门的路由 `ip add r 10.103.97.2 via 192.168.253.131`. 通过万兆网卡来进行寻路。解决通信问题
![](../../images/arch.png)

情形三

网卡名称尽量统一， 如果做不到， 为万兆内网配一个网关吧.  用户自行解决

用户有情况需要用到防火墙`firewalld`. 
