<div align="center">
  <p>
    <b>一条命令部署 Kubernetes 高可用集群 👋</b>
  </p>
  <p>
     <i>只能用丝滑一词形容的kubernetes高可用安装（kubernetes install）工具，一条命令，离线安装，包含所有依赖，内核负载不依赖haproxy keepalived,纯golang开发,99年证书,支持v1.16.8 v1.15.11 v1.17.4 v1.18.0!</i>
  </p>
  <p>

  [![Awesome](https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg)](https://github.com/fanux/sealos)
  [![Build Status](https://cloud.drone.io/api/badges/fanux/sealos/status.svg)](https://cloud.drone.io/fanux/sealos)
  [![Website](https://img.shields.io/website?url=https%3A%2F%2Fpostwoman.io&logo=Postwoman)](https://sealyun.com)
  [![Go Report Card](https://goreportcard.com/badge/github.com/fanux/sealos)](https://goreportcard.com/report/github.com/fanux/sealos)
  [![Chat on Telegram](https://img.shields.io/badge/chat-Telegram-blueviolet?logo=Telegram)](https://t.me/gsealyun)

  </p>
</div>

---

**文档: _[官方文档](https://sealyun.com/docs), [博客](https://fuckcloudnative.io)_**

**加入组织: _[Telegram](https://t.me/gsealyun)_**

![](./arch.png)

[English Docs](/README_en.md)

# 🚀 快速开始

> 环境信息

主机名|IP地址
---|---
master0|192.168.0.2 
master1|192.168.0.3 
master2|192.168.0.4 
node0|192.168.0.5 

服务器密码：123456

> 只需要准备好服务器，在任意一台服务器上执行下面命令即可

```sh
# 下载并安装sealos, sealos是个golang的二进制工具，直接下载拷贝到bin目录即可, release页面也可下载
$ wget -c https://sealyun.oss-cn-beijing.aliyuncs.com/latest/sealos && \
    chmod +x sealos && mv sealos /usr/bin 

# 下载离线资源包
$ wget -c https://sealyun.oss-cn-beijing.aliyuncs.com/d551b0b9e67e0416d0f9dce870a16665-1.18.0/kube1.18.0.tar.gz 

# 安装一个三master的kubernetes集群
$ sealos init --passwd 123456 \
	--master 192.168.0.2  --master 192.168.0.3  --master 192.168.0.4  \
	--node 192.168.0.5 \
	--pkg-url /root/kube1.18.0.tar.gz \
	--version v1.18.0
```

> 参数含义

参数名|含义|示例
---|---|---
passwd|服务器密码|123456
master|k8s master节点IP地址| 192.168.0.2
node|k8s node节点IP地址|192.168.0.3
pkg-url|离线资源包地址，支持下载到本地，或者一个远程地址|/root/kube1.16.0.tar.gz
version|[资源包](http://store.lameleg.com)对应的版本|v1.16.0

> 增加master

```shell script
🐳 → sealos join --master 192.168.0.6 --master 192.168.0.7
🐳 → sealos join --master 192.168.0.6-192.168.0.9  # 或者多个连续IP
```

> 增加node

```shell script
🐳 → sealos join --node 192.168.0.6 --node 192.168.0.7
🐳 → sealos join --node 192.168.0.6-192.168.0.9  # 或者多个连续IP
```
> 删除指定master节点

```shell script
🐳 → sealos clean --master 192.168.0.6 --master 192.168.0.7
🐳 → sealos clean --master 192.168.0.6-192.168.0.9  # 或者多个连续IP
```

> 删除指定node节点

```shell script
🐳 → sealos clean --node 192.168.0.6 --node 192.168.0.7
🐳 → sealos clean --node 192.168.0.6-192.168.0.9  # 或者多个连续IP
```

> 清理集群

```shell script
🐳 → sealos clean
```

# ✅ 特性

- [x] 99年证书
- [x] 不依赖ansible haproxy keepalived, 一个二进制工具，0依赖
- [x] 离线安装，不同kubernetes版本下载对应不同版本的[资源包](http://store.lameleg.com)即可,离线包包含所有二进制文件配置文件和镜像
- [x] 高可用通过ipvs实现的localLB，占用资源少，稳定可靠，类似kube-proxy的实现
- [x] 几乎可兼容所有支持systemd的x86_64架构的环境
- [x] 轻松实现集群节点的增加/删除
- [x] 上千用户在线上环境使用sealos，稳定可靠
- [x] 资源包放在阿里云oss上，再也不用担心网速
- [x] dashboard ingress prometheus等APP 同样离线打包，一键安装
