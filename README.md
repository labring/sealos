[![Awesome](https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg)](https://github.com/fanux/sealos)
[![Build Status](https://cloud.drone.io/api/badges/fanux/sealos/status.svg)](https://cloud.drone.io/fanux/sealos)

# support 1.16
两条命令安装1.16.0，其它版本下载对应离线包即可
```
wget https://github.com/fanux/sealos/releases/download/v2.0.7/sealos && chmod +x sealos && mv sealos /usr/bin 

sealos init --passwd YOUR_SERVER_PASSWD \
	--master 192.168.0.2  --master 192.168.0.3  --master 192.168.0.4  \
	--node 192.168.0.5 \
	--pkg-url https://sealyun.oss-cn-beijing.aliyuncs.com/cf6bece970f6dab3d8dc8bc5b588cc18-1.16.0/kube1.16.0.tar.gz \
	--version v1.16.0
```

![](./arch.png)

[English docs](README_en.md)

# 概述与设计原则
   sealos旨在做一个简单干净轻量级稳定的kubernetes安装工具，能很好的支持高可用安装。 其实把一个东西做的功能强大并不难，但是做到极简且灵活可扩展就比较难。
   所以在实现时就必须要遵循这些
