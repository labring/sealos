import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 运行 Kubernetes 集群/应用组

## 运行 Calico

<Tabs groupId="imageNum">
  <TabItem value="single" label="单个镜像" default>

```shell
$ sealos run labring/oci-kubernetes-calico:1.24.0-amd64  \
 --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
 --nodes 192.168.64.21,192.168.64.19
```

  </TabItem>
  <TabItem value="multiple" label="多个镜像">

```shell
$ sealos run labring/kubernetes:v1.25.0 \
  labring/helm:v3.8.2 labring/calico:v3.24.1 \
--masters 192.168.64.2,192.168.64.22,192.168.64.20 \
--nodes 192.168.64.21,192.168.64.19
```

  </TabItem>
</Tabs>

## 运行 OpenEBS

<Tabs groupId="imageNum">
  <TabItem value="single" label="单个镜像" default>

```shell
$ sealos run labring/oci-kubernetes-calico-openebs:1.24.0-amd64  \
 --masters 192.168.64.2,192.168.64.22,192.168.64.20 \
 --nodes 192.168.64.21,192.168.64.19
```

  </TabItem>
  <TabItem value="multiple" label="多个镜像">

```shell
$ sealos run labring/kubernetes:v1.25.0 \
  --masters 192.168.64.2,192.168.64.22,192.168.64.20  \
  --nodes 192.168.64.21,192.168.64.19
$ sealos run labring/helm:v3.8.2 labring/calico:v3.24.1
$ sealos run labring/openebs:3.1.0
```

  </TabItem>
</Tabs>

## 覆盖应用命令

`--cmd` 可以覆盖 Kubefile(Dockerfile) 里面的 `CMD` 命令：

```shell
sealos run labring/mysql-operator:8.0.23-14.1 --cmd "kubectl apply -f ."
```
