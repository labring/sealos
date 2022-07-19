import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Exec any command on any hosts

## Exec to default cluster

<Tabs groupId="imageNum">
  <TabItem value="single" label="Default" default>

```shell
$ sealos exec "cat /etc/hosts"
```

  </TabItem>
  <TabItem value="multiple" label="Specify cluster">

```shell
$ sealos exec -c my-cluster "cat /etc/hosts"
```

  </TabItem>
</Tabs>

## Exec to setting

<Tabs groupId="image">
  <TabItem value="Role label" label="Role label" default>

```shell
$ sealos exec -c my-cluster -r master,slave,node1 "cat /etc/hosts"
```

  </TabItem>
  <TabItem value="IPS" label="IPS">

```shell
$ sealos exec -c my-cluster --ips 172.16.1.38 "cat /etc/hosts"
```

  </TabItem>
</Tabs>
