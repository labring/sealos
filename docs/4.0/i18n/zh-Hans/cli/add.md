import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 添加 Kubernetes 节点

<Tabs groupId="add_type">
  <TabItem value="add_node" label="节点" default>

```shell
$ sealos add --nodes x.x.x.x
```

  </TabItem>

  <TabItem value="add_master" label="Master 节点" default>

```shell
$ sealos add --masters x.x.x.x --nodes x.x.x.x
$ sealos add --masters x.x.x.x-x.x.x.y --nodes x.x.x.x-x.x.x.y
```

  </TabItem>
</Tabs>
