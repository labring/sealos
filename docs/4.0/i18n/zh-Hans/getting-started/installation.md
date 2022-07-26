---
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 安装

<Tabs groupId="arch">
  <TabItem value="amd64" label="amd64" default>

```shell
$ wget https://github.com/labring/sealos/releases/download/v4.0.0/sealos_4.0.0_linux_amd64.tar.gz \
   && tar zxvf sealos_4.0.0_linux_amd64.tar.gz && chmod +x sealos && mv sealos /usr/bin
```

  </TabItem>
  <TabItem value="arm64" label="arm64">

```shell
$ wget https://github.com/labring/sealos/releases/download/v4.0.0/sealos_4.0.0_linux_arm64.tar.gz \
   && tar zxvf sealos_4.0.0_linux_arm64.tar.gz && chmod +x sealos && mv sealos /usr/bin
```

  </TabItem>
</Tabs>
