 # 【重要通知】
 
 sealos即将贡献给阿里巴巴，更名为sealer [ˈsiːlər]密封罐意为把整个集群封装起来，会迎来一个大版本的升级。
 
 阿里巴巴从去年五月份内部开始在某些场景使用sealos，内部fork的版本trident在sealos基础上作出了非常多的优化使系统更加稳定功能更加强大。
 21年开始重大创新的想法也彻底使sealos脱胎换骨，实现整个集群的 build share run, 我们希望这些能力也能够惠及更多开源社区的开发者们。
 项目将继续开源~
 
 <a href="https://trackgit.com">
<img src="https://us-central1-trackgit-analytics.cloudfunctions.net/token/ping/kexrkhvqjlzkdiap4zke" alt="trackgit-views" />
</a>

![](https://socialify.git.ci/fanux/sealos/image?description=1&font=Source%20Code%20Pro&forks=1&language=1&pattern=Charlie%20Brown&stargazers=1&theme=Light)

<div align="center">
  <p>
    <b>一条命令部署 Kubernetes 高可用集群 👋</b>
  </p>
  <p>
     <i>只能用丝滑一词形容的kubernetes高可用安装（kubernetes install）工具，一条命令，离线安装，包含所有依赖，内核负载不依赖haproxy keepalived,纯golang开发,99年证书,支持v1.20.0 v1.19.5 v1.18.13 v1.17.15!</i>
  </p>
  <p>

  [![Awesome](https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg)](https://github.com/fanux/sealos)
  [![Build Status](https://github.com/fanux/sealos/actions/workflows/release.yml/badge.svg)](https://github.com/fanux/sealos/actions)
  [![Website](https://img.shields.io/website?url=https%3A%2F%2Fpostwoman.io&logo=Postwoman)](https://sealyun.com)
  [![Go Report Card](https://goreportcard.com/badge/github.com/fanux/sealos)](https://goreportcard.com/report/github.com/fanux/sealos)
  [![Chat on Telegram](https://img.shields.io/badge/chat-Telegram-blueviolet?logo=Telegram)](https://t.me/gsealyun)

  </p>
</div>

---

**文档: _[官方文档](https://www.sealyun.com/instructions), [博客](https://fuckcloudnative.io)_**

**加入组织: _钉钉群(35371178), [Telegram](https://t.me/gsealyun)_**

![](./arch.png)

[English Docs](/README_en.md)

# 支持的环境

## Linux 发行版, CPU架构

- Debian 9+,  x86_64/ arm64
- Ubuntu 16.04, 18.04, 20.04,  x86_64/ arm64
- Centos/RHEL 7.6+,  x86_64/ arm64
- 其他支持 systemd 的系统环境.  x86_64/ arm64

## kubernetes 版本

- 1.16+
- 1.17+
- 1.18+
- 1.19+
- 1.20+

更多版本支持, 详细查看[sealyun.com](https://www.sealyun.com)

## 要求和建议

- 最低资源要求
   - 2 vCpu
   - 4G Ram
   - 40G+ 存储

- 操作系统要求
   - ssh 可以访问各安装节点
   - 各节点主机名不相同，并满足kubernetes的主机名要求。
   - 各节点时间同步
   - 网卡名称如果是不常见的，建议修改成规范的网卡名称， 如(eth.*|en.*|em.*)
   - kubernetes1.20+ 使用containerd作为cri. 不需要用户安装docker/containerd. sealos会安装1.3.9版本containerd。
   - kubernetes1.19及以下 使用docker作为cri。 也不需要用户安装docker。 sealos会安装1.19.03版本docker
 - 网络和 DNS 要求：
   - 确保 /etc/resolv.conf 中的 DNS 地址可用。否则，可能会导致群集中coredns异常。 
   - 如果使用阿里云/华为云主机部署。 默认的pod网段会和阿里云的dns网段冲突， 建议自定义修改pod网段, 在init的时候指定`--podcidr` 来修改。
   - sealos 默认会关闭防火墙， 如果需要打开防火墙， 建议手动放行相关的端口。
 - 内核要求:
   - cni组件选择cilium时要求内核版本不低于5.4

# 🚀 快速开始

> 环境信息

主机名|IP地址
---|---
master0|192.168.0.2 
master1|192.168.0.3 
master2|192.168.0.4 
node0|192.168.0.5 

服务器密码：123456

**kubernetes .0版本不建议上生产环境!!!**

> 只需要准备好服务器，在任意一台服务器上执行下面命令即可

```sh
# 下载并安装sealos, sealos是个golang的二进制工具，直接下载拷贝到bin目录即可, release页面也可下载
$ wget -c https://sealyun.oss-cn-beijing.aliyuncs.com/latest/sealos && \
    chmod +x sealos && mv sealos /usr/bin 

# 下载离线资源包
$ wget -c https://sealyun.oss-cn-beijing.aliyuncs.com/2fb10b1396f8c6674355fcc14a8cda7c-v1.20.0/kube1.20.0.tar.gz

# 安装一个三master的kubernetes集群
$ sealos init --passwd '123456' \
	--master 192.168.0.2  --master 192.168.0.3  --master 192.168.0.4  \
	--node 192.168.0.5 \
	--pkg-url /root/kube1.20.0.tar.gz \
	--version v1.20.0
```

> 参数含义

参数名|含义|示例
---|---|---
passwd|服务器密码|123456
master|k8s master节点IP地址| 192.168.0.2
node|k8s node节点IP地址|192.168.0.3
pkg-url|离线资源包地址，支持下载到本地，或者一个远程地址|/root/kube1.20.0.tar.gz
version|[资源包](https://www.sealyun.com/goodsDetail?type=cloud_kernel&name=kubernetes)对应的版本|v1.20.0

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
🐳 → sealos clean --all
```

# ✅ 特性

- [x] 支持ARM版本离线包，v1.20版本离线包支持containerd集成，完全抛弃docker
- [x] 99年证书, 支持集群备份，升级
- [x] 不依赖ansible haproxy keepalived, 一个二进制工具，0依赖
- [x] 离线安装，不同kubernetes版本下载对应不同版本的[资源包](https://www.sealyun.com/goodsDetail?type=cloud_kernel&name=kubernetes)即可,离线包包含所有二进制文件配置文件和镜像
- [x] 高可用通过ipvs实现的localLB，占用资源少，稳定可靠，类似kube-proxy的实现
- [x] 几乎可兼容所有支持systemd的x86_64架构的环境
- [x] 轻松实现集群节点的增加/删除
- [x] 上千用户在线上环境使用sealos，稳定可靠
- [x] 资源包放在阿里云oss上，再也不用担心网速
- [x] dashboard ingress prometheus等APP 同样离线打包，一键安装
