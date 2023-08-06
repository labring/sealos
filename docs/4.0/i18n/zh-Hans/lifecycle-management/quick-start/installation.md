---
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 安装sealos

你可以通过运行命令来获取版本列表:

```shell
curl --silent "https://api.github.com/repos/labring/sealos/releases" | jq -r '.[].tag_name'
```

> 注意:在选择版本时，建议使用稳定版本例如`v4.3.0`。像`v4.3.0-rc1`、`v4.3.0-alpha1`这样的版本是预发布版，请谨慎使用。

设置`VERSION`环境变量为latest版本号，或者将`VERSION`替换为您要安装的Sealos版本:

```shell
VERSION=`curl -s https://api.github.com/repos/labring/sealos/releases/latest | grep -oE '"tag_name": "[^"]+"' | head -n1 | cut -d'"' -f4`
```

## 二进制自动下载

```bash
curl -sfL https://raw.githubusercontent.com/labring/sealos/${VERSION}/scripts/install.sh |
  sh - ${VERSION} labring/sealos

```

## 二进制手动下载

<Tabs groupId="arch">
  <TabItem value="amd64" label="amd64" default>

```bash
$ wget https://github.com/labring/sealos/releases/download/${VERSION}/sealos_${VERSION#v}_linux_amd64.tar.gz \
   && tar zxvf sealos_${VERSION#v}_linux_amd64.tar.gz sealos && chmod +x sealos && mv sealos /usr/bin
```

  </TabItem>
  <TabItem value="arm64" label="arm64">

```bash
$ wget https://github.com/labring/sealos/releases/download/${VERSION}/sealos_${VERSION#v}_linux_arm64.tar.gz \
   && tar zxvf sealos_${VERSION#v}_linux_arm64.tar.gz sealos && chmod +x sealos && mv sealos /usr/bin
```

  </TabItem>
</Tabs>

## 包管理工具安装

### DEB 源

```bash
echo "deb [trusted=yes] https://apt.fury.io/labring/ /" | sudo tee /etc/apt/sources.list.d/labring.list
sudo apt update
sudo apt install sealos
```

### RPM 源

```bash
sudo cat > /etc/yum.repos.d/labring.repo << EOF
[fury]
name=labring Yum Repo
baseurl=https://yum.fury.io/labring/
enabled=1
gpgcheck=0
EOF
sudo yum clean all
sudo yum install sealos
```

## 源码安装

### 前置依赖
1. `linux`
2. `git`  
3. `golang` 1.20+  
4. `libgpgme-dev libbtrfs-dev libdevmapper-dev`

如果在 `arm64` 环境下需要添加 `:arm64` 后缀。

### 构建

```bash
# git clone the repo
git clone https://github.com/labring/sealos.git
# just make it
make build BINS=sealos
```

