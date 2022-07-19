import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 删除 Kubernetes 节点

<Tabs groupId="imageNum">
  <TabItem value="single" label="节点" default>

```shell
$ sealos delete --nodes x.x.x.x
```

  </TabItem>

  <TabItem value="multiple" label="Master 节点" default>

```shell
$ sealos delete --masters x.x.x.x
```

  </TabItem>

  <TabItem value="both" label="节点和 Master 节点" default>

```shell
$ sealos delete --masters x.x.x.x --nodes x.x.x.x
$ sealos delete --masters x.x.x.x-x.x.x.y --nodes x.x.x.x-x.x.x.y
```

  </TabItem>

</Tabs>
