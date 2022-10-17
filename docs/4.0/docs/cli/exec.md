import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Execute any command on any hosts

## Cluster-level execution

<Tabs groupId="exec_type_cluster">
  <TabItem value="exec_default" label="Default" default>

```shell
$ sealos exec "cat /etc/hosts"
```

  </TabItem>
  <TabItem value="exec_cluster" label="Specify cluster">

```shell
$ sealos exec -c my-cluster "cat /etc/hosts"
```

  </TabItem>
</Tabs>

## Node-level execution

<Tabs groupId="exec_type_node">
  <TabItem value="role_label" label="Role label" default>

```shell
$ sealos exec -c my-cluster -r master,slave,node1 "cat /etc/hosts"
```

  </TabItem>
  <TabItem value="ips" label="IPs">

```shell
$ sealos exec -c my-cluster --ips 172.16.1.38 "cat /etc/hosts"
```

  </TabItem>
</Tabs>
