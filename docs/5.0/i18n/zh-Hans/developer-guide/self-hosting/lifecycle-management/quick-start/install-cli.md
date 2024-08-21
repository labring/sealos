---
sidebar_position: 1
keywords: [sealos, sealos 命令行, sealos 下载]
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 下载 Sealos 命令行工具

你可以通过运行命令来获取版本列表：

```shell
$ curl --silent "https://api.github.com/repos/labring/sealos/releases" | jq -r '.[].tag_name'
```

> 注意：在选择版本时，建议使用稳定版本例如 `v4.3.0`。像 `v4.3.0-rc1`、`v4.3.0-alpha1` 这样的版本是预发布版，请谨慎使用。

设置 `VERSION` 环境变量为 latest 版本号，或者将 `VERSION` 替换为您要安装的 Sealos 版本：

```shell
$ VERSION=`curl -s https://api.github.com/repos/labring/sealos/releases/latest | grep -oE '"tag_name": "[^"]+"' | head -n1 | cut -d'"' -f4`
```

## 二进制自动下载

```shell

$ curl -sfL https://mirror.ghproxy.com/https://raw.githubusercontent.com/labring/sealos/main/scripts/install.sh | PROXY_PREFIX=https://mirror.ghproxy.com sh -s ${VERSION} labring/sealos

```

## 二进制手动下载

<Tabs groupId="arch">
  <TabItem value="amd64" label="amd64" default>

```shell
$ wget https://mirror.ghproxy.com/https://github.com/labring/sealos/releases/download/${VERSION}/sealos_${VERSION#v}_linux_amd64.tar.gz \
  && tar zxvf sealos_${VERSION#v}_linux_amd64.tar.gz sealos && chmod +x sealos && mv sealos /usr/bin
```

  </TabItem>
  <TabItem value="arm64" label="arm64">

```shell
$ wget https://mirror.ghproxy.com/https://github.com/labring/sealos/releases/download/${VERSION}/sealos_${VERSION#v}_linux_arm64.tar.gz \
  && tar zxvf sealos_${VERSION#v}_linux_arm64.tar.gz sealos && chmod +x sealos && mv sealos /usr/bin
```

  </TabItem>
</Tabs>

## 包管理工具安装

### DEB 源

```shell
$ echo "deb [trusted=yes] https://apt.fury.io/labring/ /" | sudo tee /etc/apt/sources.list.d/labring.list
$ sudo apt update
$ sudo apt install sealos
```

### RPM 源

```shell
$ sudo cat > /etc/yum.repos.d/labring.repo << EOF
[fury]
name=labring Yum Repo
baseurl=https://yum.fury.io/labring/
enabled=1
gpgcheck=0
EOF
$ sudo yum clean all
$ sudo yum install sealos
```

## 源码安装

### 前置依赖
1. `linux`
2. `git`
3. `golang` 1.20+
4. `libgpgme-dev libbtrfs-dev libdevmapper-dev`

如果在 `arm64` 环境下需要添加 `:arm64` 后缀。

### 构建

```shell
# git clone the repo
$ git clone https://github.com/labring/sealos.git
# just make it
$ make build BINS=sealos
```

## 下一步

[安装 K8s 集群](/self-hosting/lifecycle-management/quick-start/deploy-kubernetes.md)。

