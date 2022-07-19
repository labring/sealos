import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 在任意节点执行任意命令

## 指定 Exec 集群

<Tabs groupId="imageNum">
  <TabItem value="single" label="默认" default>

```shell
$ sealos exec "cat /etc/hosts"
```

  </TabItem>
  <TabItem value="multiple" label="指定集群">

```shell
$ sealos exec -c my-cluster "cat /etc/hosts"
```

  </TabItem>
</Tabs>

## 指定 Exec 设置

<Tabs groupId="image">
  <TabItem value="Role label" label="节点标签" default>

```shell
$ sealos exec -c my-cluster -r master,slave,node1 "cat /etc/hosts"
```

  </TabItem>
  <TabItem value="IPs" label="IPs">

```shell
$ sealos exec -c my-cluster --ips 172.16.1.38 "cat /etc/hosts"
```

  </TabItem>
</Tabs>
