import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 在任意节点执行任意命令

## 指定执行命令的集群

<Tabs groupId="exec_type_cluster">
  <TabItem value="exec_default" label="默认" default>

```shell
$ sealos exec "cat /etc/hosts"
```

  </TabItem>
  <TabItem value="exec_cluster" label="指定集群">

```shell
$ sealos exec -c my-cluster "cat /etc/hosts"
```

  </TabItem>
</Tabs>

## 指定执行命令的节点

<Tabs groupId="exec_type_node">
  <TabItem value="role_label" label="节点角色标签" default>

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
