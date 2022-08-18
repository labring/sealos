# 使用 Clusterfile 部署集群

```shell
$ sealos apply -f Clusterfile
```

Clusterfile 内容：

```yaml
apiVersion: apps.sealos.io/v1beta1
kind: Cluster
metadata:
  name: default
spec:
  # 服务器 IP 地址列表和角色
  hosts:
    - ips:
        - 192.168.0.2:22
        - 192.168.0.3:22
        - 192.168.0.4:22
      roles:
        - master
        - amd64
    - ips:
        - 192.168.0.5:22
        - 192.168.0.6:22
        - 192.168.0.7:22
      roles:
        - node
        - amd64
  image:
    - labring/kubernetes:v1.24.0
    - labring/calico:v3.22.1
  ssh:
    passwd: xxx
    pk: /root/.ssh/id_rsa
    port: 22
    user: root
```

增加删除节点都可以编辑 `.sealos/default/Clusterfile` 文件然后重新 `sealos apply -f Clusterfile` 即可
