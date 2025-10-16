---
sidebar_position: 2
---

# 模板配置安装

我们也可以使用 Go 模版语法来编写 Clusterfile（就像 [Helm](https://helm.sh/) 一样，但暂不支持部分模版函数，如 `include`/`tpl`/`require`/`lookup`）。 例如，创建 `Clusterfile.yaml` 如下：

```yaml
apiVersion: apps.sealos.io/v1beta1
kind: Cluster
metadata:
  name: {{ .Values.clusterName }}
spec:
  hosts:
    - ips: {{ .Values.masters | toYaml | nindent 8 }}
      roles: ["master", "amd64"]
    {{- with .Values.nodes }}
    - ips: {{ . | toYaml | nindent 8 }}
      roles: ["node", "amd64"]
    {{- end }}
  image: {{ .Values.images | toYaml | nindent 4 }}
  ssh:
    passwd: {{ env "SSH_PASSWORD" .Values.ssh.passwd }}
    pk: {{ default "~/.ssh/id_rsa" .Values.ssh.pk }}
    port: {{ default 22 .Values.ssh.port | int }}
    user: {{ default "root" .Values.ssh.user }}
---
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  dnsDomain: {{ default "cluster.local" .Values.networking.dnsDomain }}
  serviceSubnet: {{ default "10.96.0.0/18" .Values.networking.serviceSubnet }}
  podSubnet: {{ default "100.64.0.0/17" .Values.networking.podSubnet }}
```

随后，创建一个自定义的 values 文件 `example.values.yaml`：

```yaml
clusterName: default
images:
  - dockerhub.tencentcloudcr.com/labring/kubernetes:v1.23.8
  - dockerhub.tencentcloudcr.com/labring/calico:v3.24.1
masters:
  - 10.74.16.27:22
  - 10.74.16.140:22
  - 10.74.16.101:22
nodes: []
ssh:
  # passwd: notSetYet
  pk: /path/to/private/key/file
  port: 22
  user: root
networking:
  dnsDomain: cluster.local
  serviceSubnet: 10.96.0.0/18
  podSubnet: 100.64.0.0/17
```

然后就可以像这样部署集群了：

```shell
$ sealos apply -f Clusterfile.yaml --values example.values.yaml --set clusterName=testlocal --env SSH_PASSWORD=s3cret 
```
