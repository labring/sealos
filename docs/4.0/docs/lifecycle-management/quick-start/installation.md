---
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Installing Sealos

## Binary Auto Download

```bash
$ curl -sfL  https://raw.githubusercontent.com/labring/sealos/v4.2.0/scripts/install.sh \
    | sh -s v4.2.0 labring/sealos
```

## Binary Manual Download

<Tabs groupId="arch">
  <TabItem value="amd64" label="amd64" default>

```bash
$ wget https://github.com/labring/sealos/releases/download/v4.2.0/sealos_4.2.0_linux_amd64.tar.gz \
   && tar zxvf sealos_4.2.0_linux_amd64.tar.gz sealos && chmod +x sealos && mv sealos /usr/bin
```

  </TabItem>
  <TabItem value="arm64" label="arm64">

```bash
$ wget https://github.com/labring/sealos/releases/download/v4.2.0/sealos_4.2.0_linux_arm64.tar.gz \
   && tar zxvf sealos_4.2.0_linux_arm64.tar.gz sealos && chmod +x sealos && mv sealos /usr/bin
```

  </TabItem>
</Tabs>

## Package Management Tool Installation

### DEB Repository

```bash
echo "deb [trusted=yes] https://apt.fury.io/labring/ /" | sudo tee /etc/apt/sources.list.d/labring.list
sudo apt update
sudo apt install sealos
```

### RPM Repository

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

## Source Code Installation

### Prerequisites
1. `linux`
2. `git`
3. `golang` 1.20+
4. `libgpgme-dev libbtrfs-dev libdevmapper-dev`

If you are in an `arm64` environment, add the `:arm64` suffix.

### Build

```bash
# git clone the repo
git clone https://github.com/labring/sealos.git
# just make it
make build BINS=sealos
```
