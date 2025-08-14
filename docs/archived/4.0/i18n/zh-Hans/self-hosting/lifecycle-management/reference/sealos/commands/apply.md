---
sidebar_position: 1
---

# apply 启动集群

`sealos apply` 是 Sealos 命令行工具中的一个重要命令，用于在 Kubernetes 集群中运行集群镜像。本指南将详细介绍其使用方法和选项。

## 基本用法

`sealos apply` 命令的基本用法如下：

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
    - labring/kubernetes:v1.25.0
    - labring/helm:v3.8.2
    - labring/calico:v3.24.1
  ssh:
    passwd: xxx
    pk: /root/.ssh/id_rsa
    port: 22
    user: root
```

这条命令会根据指定的 `Clusterfile` 文件在 Kubernetes 集群中运行集群镜像。

## 选项

`sealos apply` 命令提供了多种选项，用于定制命令的行为：

- `-f, --Clusterfile='Clusterfile'`: 指定要应用的集群文件。默认为 `Clusterfile`。
- `--config-file=[]`: 指定自定义Config文件的路径，用于替换或者修改资源。
- `--env=[]`: 设置在命令执行过程中要使用的环境变量。
- `--set=[]`: 在命令行上设置值，一般是替换模板的值。
- `--values=[]`: 指定要应用到 `Clusterfile` 的values文件，一般是用于模板方式。

每个选项后面都可以跟随一个或多个参数。多个参数之间用逗号分隔。

例如，你可以使用 `--set` 选项在命令行上设置一些值：

```shell
sealos apply -f Clusterfile --set key1=value1,key2=value2
```

这条命令会将 `key1` 和 `key2` 的值设置为 `value1` 和 `value2`，然后应用 `Clusterfile`。

同样，你也可以使用 `--values` 选项指定一个值文件：

```shell
sealos apply -f Clusterfile --values values.yaml
```

这条命令会根据 `values.yaml` 文件中的值应用 `Clusterfile`。

**更多示例请参考[启动镜像](/self-hosting/lifecycle-management/operations/run-cluster/)**

以上就是 `sealos apply` 命令的使用指南，希望对你有所帮助。如果你在使用过程中遇到任何问题，欢迎向我们提问。
