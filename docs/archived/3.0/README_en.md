
[![Awesome](https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg)](https://github.com/labring/sealos)
[![Build Status](https://github.com/labring/sealos/actions/workflows/release.yml/badge.svg)](https://github.com/labring/sealos/actions)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fpostwoman.io&logo=Postwoman)](https://sealyun.com)
[![Go Report Card](https://goreportcard.com/badge/github.com/labring/sealos)](https://goreportcard.com/report/github.com/labring/sealos)
[![Chat on Telegram](https://img.shields.io/badge/chat-Telegram-blueviolet?logo=Telegram)](https://t.me/gsealyun)
---
**Document: _[Official document](https://www.sealyun.com/instructions), [中文文档](/README.md), [Blog](https://fuckcloudnative.io)_**

**Organization: _DingTalk(35371178), [Telegram](https://t.me/cloudnativer)_**
---
# Introduction
Build a kubernetes HA cluster for a production environment.

![](docs/images/arch.png)
* Each node will be configured with an ipvs proxy for masters LB, so we needn't haproxy or keepalived any more.
* Then run a [lvscare](https://github.com/labring/lvscare) as a staic pod to check apiserver is aviliable. `/etc/kubernetes/manifests/sealyun-lvscare.yaml`
* If any master is down, lvscare will remove the ipvs realserver, when master recover it will add it back.
* Sealos will send package and apply install commands, so we needn't ansible.

# ✨ Supported Environment

## Linux Distributions, CPU Architecture

- Debian 9+,  x86_64/ arm64
- Ubuntu 16.04， 18.04， 20.04 ,  x86_64/ arm64
- Centos/RHEL 7.6+,  x86_64/ arm64
- 99% systemd manage linux system， x86_64/ arm64
- Kylin arm64

## kubernetes Versions

- 1.16+
- 1.17+
- 1.18+
- 1.19+
- 1.20+
- 1.21+
- 1.22+
- 1.23+

Looking for more supported versions, [sealyun.com](https://www.sealyun.com).

## Requirements and Recommendations

- Minimum resource requirements
   - 2 vCpu
   - 4G RAM
   - 40G+ Storage

- OS requirements
   - SSH can access to all nodes.
   - These nodes have unique host names that meet the hostname requirements for kubernetes.
   - Time synchronization for all nodes.
   - Network Iface name is unique, it is recommended to change it to a standard NIC name, such as (eth.|en.|em.*).
   - Kubernetes1.20+, use containerd for default cri. user should not to install containerd or docker-ce. sealos will do it
   - Kubernetes1.19-, use docker for default cri. user should not to install docker-ce. sealos will do it for you
- Networking and DNS requirements：
  - Make sure the DNS address in /etc/resolv.conf is available. Otherwise, it may cause some issues of DNS in cluster。 
  - If you use Ali cloud or Huawei cloud host to deploy.  The default pod segment will conflict with AliCloud's dns segment, it is recommended to customize the pod segment by specifying --podcidr during init.
  - Sealos disables the firewall by default ，If you need to open the firewall, it is recommended to release the relevant ports manually.
- Kernel requirements:
  - The cni component requires a kernel version of not less than 5.4 when selecting cilium
  
# Tips
- If you use Tencent Cloud Hosting to deploy, calico's IPIP rules are disabled by default, and you need to change to VXLAN rules to use it properly.


# 🚀 Quick Start

> Environmental information

Hostname|IP Address
---|---
master0|192.168.0.2
master1|192.168.0.3
master2|192.168.0.4
node0|192.168.0.5

Server password：123456

**kubernetes .0, the version is not recommended for production environment!!!**

> Just prepare the server and execute the following command on any server

```bash
# download and install sealos, sealos is a binary tool of golang, just download and copy directly to the bin directory, the release page can also be downloaded
wget -c https://sealyun-home.oss-cn-beijing.aliyuncs.com/sealos/latest/sealos && \
    chmod +x sealos && mv sealos /usr/bin

# download offline resource pack
wget -c https://sealyun.oss-cn-beijing.aliyuncs.com/05a3db657821277f5f3b92d834bbaf98-v1.22.0/kube1.22.0.tar.gz

# Install a three-master kubernetes cluster
sealos init --passwd '123456' \
	--master 192.168.0.2  --master 192.168.0.3  --master 192.168.0.4  \
	--node 192.168.0.5 \
	--pkg-url /root/kube1.22.0.tar.gz \
	--version v1.22.0
```

> Parameter meaning

| parameter | meaning                                                                                                      | example                 |
|-----------|--------------------------------------------------------------------------------------------------------------|-------------------------|
| passwd    | server password                                                                                              | 123456                  |
| master    | k8s master IP Address                                                                                        | 192.168.0.2             |
| node      | k8s node IP Address                                                                                          | 192.168.0.3             |
| pkg-url   | offline resource package address, support downloading to local or a remote address                           | /root/kube1.22.0.tar.gz |
| version   | [Resource pack](https://www.sealyun.com/goodsList) Corresponding version | v1.22.0                 |


> add master

```bash
🐳 → sealos join --master 192.168.0.6 --master 192.168.0.7
🐳 → sealos join --master 192.168.0.6-192.168.0.9  # or multiple consecutive IPs
```

> add node

```bash
🐳 → sealos join --node 192.168.0.6 --node 192.168.0.7
🐳 → sealos join --node 192.168.0.6-192.168.0.9  # or multiple consecutive IPs
```

> delete the specified master

```bash
🐳 → sealos clean --master 192.168.0.6 --master 192.168.0.7
🐳 → sealos clean --master 192.168.0.6-192.168.0.9  # or multiple consecutive IPs
```

> Delete the specified node

```bash
🐳 → sealos clean --node 192.168.0.6 --node 192.168.0.7
🐳 → sealos clean --node 192.168.0.6-192.168.0.9  # or multiple consecutive IPs
```

> clean up the cluster

```bash
🐳 → sealos clean --all
```

# ✅ Feature

- [x] Support ARM version offline package, v1.20 version offline package supports containerd integration, completely abandon docker
- [x] 99 years certificate, support cluster backup and upgrade
- [x] No dependency on ansible haproxy keepalived, a binary tool, 0 dependency
- [x] Offline installation, different versions of kubernetes download corresponding to different versions [Resource pack](https://www.sealyun.com/goodsDetail?type=cloud_kernel&name=kubernetes), Offline package contains all binary files configuration files and images
- [x] High-availability local LIB implemented through ipvs, which takes up less resources, is stable and reliable, and is similar to the implementation of kube-proxy
- [x] Almost compatible with all environments that support systemd x86_64 architecture
- [x] Easily add and delete cluster nodes
- [x] Thousands of users use sealos in the online environment, which is stable and reliable
- [x] The resource pack is placed on Alibaba Cloud OSS, so you don’t have to worry about network speed anymore

# 📊 Stats

![Alt](https://repobeats.axiom.co/api/embed/10ce83c1d8452210bc4a0b5a5df9d59bbc35d889.svg "Repobeats analytics image")

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=fanux/sealos&type=Date)](https://star-history.com/#fanux/sealos&Date)
