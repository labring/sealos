---
sidebar_position: 7
---

# 使用构建镜像自定义 Kubernetes 集群

本指南介绍如何使用 `kubeadm config` 构建自定义镜像来自定义 Kubernetes 集群。

## 构建自定义镜像

要构建自定义镜像，请运行以下命令：

```bash
$ mkdir -p /tmp/buildimage
  cat > /tmp/buildimage/kubeadm.yml <<EOF
  apiVersion: kubeadm.k8s.io/v1beta2
  kind: ClusterConfiguration
  networking:
    serviceSubnet: "100.55.0.0/16"
    podSubnet: "10.160.0.0/12"
EOF

$ cat > /tmp/buildimage/Kubefile <<EOF
  FROM labring/kubernetes-docker:v1.25.0
  COPY kubeadm.yml etc/
EOF

$ sudo sealos build --debug -t hack:dev  /tmp/buildimage
```

## 将应用程序配置附加到Clusterfile

接下来，我们将在`Clusterfile`中附加应用程序配置。例如，如果您想更改Pod的CIDR范围，则应更改`spec.data.spec.calicoNetwork.ipPools.cidr`字段。最终的`Clusterfile`将是这样的：

```yaml
apiVersion: apps.sealos.io/v1beta1
kind: Cluster
metadata:
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
    - hack:dev
    - labring/helm:v3.8.2
    - labring/calico:v3.24.1
  ssh:
    passwd: xxx
    pk: /root/.ssh/id_rsa
    port: 22
    user: root
status: {}
---
apiVersion: apps.sealos.io/v1beta1
kind: Config
metadata:
  name: calico
spec:
  path: charts/calico/values.yaml
  strategy: merge
  data: |
    installation:
      enabled: true
      kubernetesProvider: ""
      calicoNetwork:
        ipPools:
        - blockSize: 26
          cidr: 10.160.0.0/12
          encapsulation: IPIP
          natOutgoing: Enabled
          nodeSelector: all()
        nodeAddressAutodetectionV4:
          interface: "eth.*|en.*"
```

在这个例子中，我们已经将`calico`应用程序的配置附加到了`Clusterfile`中。此配置指定了Pod的CIDR范围和应用程序运行所需的其他选项。

## 安装群集

最后，我们可以使用`sealos apply -f Clusterfile`来安装集群。安装集群后，`Clusterfile`将保存在`.sealos/default/Clusterfile`目录中。您可以修改`Clusterfile`以进一步自定义集群。

**⚠️ 注意：**

+ 您可以参考[官方文档](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-config/)或使用`kubeadm config print init-defaults`命令打印kubeadm配置。
