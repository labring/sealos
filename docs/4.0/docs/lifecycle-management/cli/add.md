import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Add Kubernetes masters or nodes

<Tabs groupId="add_type">
  <TabItem value="add_node" label="Node" default>

```shell
$ sealos add --nodes x.x.x.x
```

  </TabItem>

  <TabItem value="add_master" label="Master" default>

```shell
$ sealos add --masters x.x.x.x --nodes x.x.x.x
$ sealos add --masters x.x.x.x-x.x.x.y --nodes x.x.x.x-x.x.x.y
```

  </TabItem>
</Tabs>
