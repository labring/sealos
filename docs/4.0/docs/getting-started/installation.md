---
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Installation

## Download From Binary

<Tabs groupId="arch">
  <TabItem value="amd64" label="amd64" default>

```bash
$ wget https://github.com/labring/sealos/releases/download/v4.1.4/sealos_4.1.4_linux_amd64.tar.gz \
   && tar zxvf sealos_4.1.4_linux_amd64.tar.gz sealos && chmod +x sealos && mv sealos /usr/bin
```

  </TabItem>
  <TabItem value="arm64" label="arm64">

```bash
$ wget https://github.com/labring/sealos/releases/download/v4.1.4/sealos_4.1.4_linux_arm64.tar.gz \
   && tar zxvf sealos_4.1.4_linux_arm64.tar.gz sealos && chmod +x sealos && mv sealos /usr/bin
```

  </TabItem>
</Tabs>

## Download From Repository

### DEB Source

```bash
echo "deb [trusted=yes] https://apt.fury.io/labring/ /" | sudo tee /etc/apt/sources.list.d/labring.list
sudo apt update
sudo apt install sealos
```

### RPM Source

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

## Install from Source

### Prerequisites
1. `git`  
2. `golang` 1.19+  
3. `libgpgme-dev libbtrfs-dev libdevmapper-dev`

Add `:arm64` when under the the `arm64` environment.

### Build

```bash
# git clone the repo
git clone https://github.com/labring/sealos.git
# just make it
make build BINS=sealos
```

