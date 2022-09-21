---
sidebar_position: 3
---

# 自定义安装配置

> 运行 `sealos gen` 生成一个 Clusterfile。 例如：

```shell
$ sealos gen labring/kubernetes:v1.24.0 labring/calico:v3.24.1 \
   --masters 192.168.0.2,192.168.0.3,192.168.0.4 \
   --nodes 192.168.0.5,192.168.0.6,192.168.0.7 --passwd xxx > Clusterfile
```

> 将 [calico Clusterfile](https://github.com/labring/sealos/blob/main/applications/calico/Clusterfile) 追加到生成的 Clusterfile 后，然后更新集群配置。例如，要修改 pods 的 CIDR 范围，就可以修改 `networking.podSubnet` 和 `spec.data.spec.calicoNetwork.ipPools.cidr` 字段。 最终的 Clusterfile 会像是这样:

<details>
<summary>Clusterfile</summary>

```yaml
apiVersion: apps.sealos.io/v1beta1
kind: Cluster
metadata:
  creationTimestamp: null
  name: default
spec:
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
    - labring/calico:v3.24.1
  ssh:
    passwd: xxx
    pk: /root/.ssh/id_rsa
    port: 22
    user: root
status: {}
---
apiVersion: kubeadm.k8s.io/v1beta2
kind: ClusterConfiguration
networking:
  podSubnet: 10.160.0.0/12
---
apiVersion: apps.sealos.io/v1beta1
kind: Config
metadata:
  name: calico
spec:
  path: manifests/calico.yaml
  data: |
    apiVersion: operator.tigera.io/v1
    kind: Installation
    metadata:
      name: default
    spec:
      # Configures Calico networking.
      calicoNetwork:
        # Note: The ipPools section cannot be modified post-install.
        ipPools:
        - blockSize: 26
          # Note: Must be the same as podCIDR
          cidr: 10.160.0.0/12
          encapsulation: IPIP
          natOutgoing: Enabled
          nodeSelector: all()
        nodeAddressAutodetectionV4:
          interface: "eth.*|en.*"
```

</details>

运行 `sealos apply -f Clusterfile` 启动集群。

集群运行成功后会把 Clusterfile 保存到 `.sealos/default/Clusterfile` 文件中，可以修改其中字段来重新 apply 对集群进行变更。