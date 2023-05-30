import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Delete Kubernetes masters or nodes

<Tabs groupId="delete_type">
  <TabItem value="delete_node" label="Node" default>

```shell
$ sealos delete --nodes x.x.x.x
```

  </TabItem>

  <TabItem value="delete_master" label="Master" default>

```shell
$ sealos delete --masters x.x.x.x
```

  </TabItem>

  <TabItem value="delete_both" label="Node && Master" default>

```shell
$ sealos delete --masters x.x.x.x --nodes x.x.x.x
$ sealos delete --masters x.x.x.x-x.x.x.y --nodes x.x.x.x-x.x.x.y
```

  </TabItem>

</Tabs>
